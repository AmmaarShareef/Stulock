import { createSessionContract, validateSessionContract } from "../src/session/contract";
import { normalizeAllowedDomains } from "../src/session/allowlist";
import { createMonitorSession, transitionMonitorSession, type MonitorAction, type MonitorSessionSnapshot } from "../src/session/engine";
import { buildLocalReport } from "../src/report/build";
import { canUseCameraGrant, type CameraGrant } from "../src/vision/eligibility";
import { blockedPageUrl } from "../src/policy/blocking";
import { VerdictCache, type PolicyVerdict } from "../src/policy/cache";
import { judgeRelevance, parseVerdict } from "../src/policy/judge-client";
import { judgeWithNano } from "../src/policy/nano";
import { describePageAddress, type PageDescriptor } from "../src/policy/rules";
import { nextIntervention } from "../src/intervention/ladder";
import { canUseSyncGrant, redeemSyncCode, syncAggregate, aggregateForSync, type SyncGrant } from "../src/sync/client";
import { pruneExpiredLocalData } from "../src/privacy/local-data";
import { localDb } from "@stulock/db";
import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

type ContractInput = { task: string; durationMinutes: number; tier: "monitor" | "light" | "average" | "locked"; allowedHelp?: string };
type VisionStatus = Readonly<{ state: "idle" | "starting" | "running" | "degraded" | "paused" | "error"; reason?: string; meanInferenceMs?: number; lastSignals?: unknown }>;
type Message =
  | { type: "phase2:get-status" }
  | { type: "phase2:start"; input: ContractInput }
  | { type: "phase2:action"; action: Exclude<MonitorAction, "TICK"> }
  | { type: "phase2:open-dashboard" }
  | { type: "phase3:get-camera-status" }
  | { type: "phase3:redeem-camera-code"; code: string }
  | { type: "phase3:start-local-vision" }
  | { type: "phase3:stop-local-vision" }
  | { type: "phase3:create-phone-offer" }
  | { type: "phase3:accept-phone-answer"; answer: string }
  | { type: "phase3:offscreen-start" }
  | { type: "phase3:offscreen-stop" }
  | { type: "phase3:offscreen-phone-offer" }
  | { type: "phase3:offscreen-phone-answer"; answer: string }
  | { type: "phase3:vision-status"; status: VisionStatus }
  | { type: "phase4:get-sync-status" }
  | { type: "phase4:redeem-sync-code"; code: string }
  | { type: "phase4:sync-latest-report" }
  | { type: "phase4:get-blocked-context"; tabId: number }
  | { type: "phase4:contest"; tabId: number };
const SNAPSHOT_KEY = "phase2:monitor-session";
const ALARM_NAME = "phase2:session-heartbeat";
const CAMERA_GRANT_KEY = "phase3:camera-grant";
const VISION_STATUS_KEY = "phase3:vision-status";
const ELIGIBILITY_ALARM = "phase3:eligibility-heartbeat";
const RETENTION_ALARM = "phase5:retention-heartbeat";
const SYNC_GRANT_KEY = "phase4:sync-grant";
const WEB_ORIGIN = new URL(import.meta.env.WXT_PUBLIC_STULOCK_WEB_ORIGIN ?? "http://localhost:3000").origin;
let queue: Promise<void> = Promise.resolve();
let cache = new VerdictCache(); let cacheSessionId: string | null = null;
const ignoredByCategory = new Map<string, number>();
const blockedTabs = new Map<number, string>();
const bypassTabs = new Set<number>();

function serial<T>(work: () => Promise<T>): Promise<T> {
  const result = queue.then(work, work);
  queue = result.then(() => undefined, () => undefined);
  return result;
}

async function loadSnapshot(): Promise<MonitorSessionSnapshot | null> {
  const stored = await browser.storage.local.get(SNAPSHOT_KEY);
  return (stored[SNAPSHOT_KEY] as MonitorSessionSnapshot | undefined) ?? null;
}

async function persist(snapshot: MonitorSessionSnapshot, eventAdded: boolean): Promise<void> {
  await browser.storage.local.set({ [SNAPSHOT_KEY]: snapshot });
  await localDb.sessionSnapshots.put({ id: snapshot.id, status: snapshot.status, snapshot, updatedAt: snapshot.updatedAt });
  if (eventAdded) {
    const event = snapshot.events.at(-1);
    if (event) await localDb.telemetry.add({ sessionId: snapshot.id, at: event.at, event: event.type });
  }
  if (snapshot.status === "ended") {
    const interventions = await localDb.policyEvents.where("sessionId").equals(snapshot.id).sortBy("at");
    const report = buildLocalReport(snapshot, interventions);
    await localDb.reports.put({ id: snapshot.id, sessionId: snapshot.id, score: report.score, report, createdAt: snapshot.endedAt ?? snapshot.updatedAt });
    await syncCompletedSession(snapshot, report);
  }
}

async function refresh(now = new Date().toISOString()): Promise<MonitorSessionSnapshot | null> {
  const snapshot = await loadSnapshot();
  if (!snapshot || snapshot.status === "ended") return snapshot;
  const next = transitionMonitorSession(snapshot, "TICK", now);
  if (next !== snapshot) await persist(next, next.events.length !== snapshot.events.length);
  return next;
}

async function update(action: MonitorAction): Promise<MonitorSessionSnapshot | null> {
  const snapshot = await refresh();
  if (!snapshot || snapshot.status === "ended") return snapshot;
  const next = transitionMonitorSession(snapshot, action);
  if (next !== snapshot) await persist(next, next.events.length !== snapshot.events.length);
  return next;
}

async function readCameraGrant(): Promise<CameraGrant | null> {
  const stored = await browser.storage.local.get(CAMERA_GRANT_KEY);
  const value = stored[CAMERA_GRANT_KEY] as CameraGrant | undefined;
  return value && canUseCameraGrant(value) ? value : null;
}

async function callEligibility(body: Record<string, string>): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(new URL("/api/extension/eligibility", WEB_ORIGIN), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store" });
    return await response.json() as Record<string, unknown>;
  } catch {
    return { eligible: false };
  }
}

function asGrant(value: Record<string, unknown>): CameraGrant | null {
  if (value.eligible !== true || typeof value.grantId !== "string" || typeof value.renewalSecret !== "string" || typeof value.expiresAt !== "string") return null;
  const grant = { grantId: value.grantId, renewalSecret: value.renewalSecret, expiresAt: value.expiresAt };
  return canUseCameraGrant(grant) ? grant : null;
}

async function verifyCameraGrant(): Promise<boolean> {
  const grant = await readCameraGrant();
  if (!grant) return false;
  const result = await callEligibility({ action: "verify", grantId: grant.grantId, renewalSecret: grant.renewalSecret });
  return result.eligible === true;
}

async function ensureOffscreenDocument(): Promise<void> {
  if (await browser.offscreen.hasDocument()) return;
  await browser.offscreen.createDocument({ url: "offscreen.html", reasons: ["USER_MEDIA", "AUDIO_PLAYBACK"], justification: "Run user-authorized on-device camera processing and self-selected intervention tones while the popup is closed." });
}

async function readSyncGrant(): Promise<SyncGrant | null> {
  const stored = await browser.storage.local.get(SYNC_GRANT_KEY); const value = stored[SYNC_GRANT_KEY] as SyncGrant | undefined;
  return canUseSyncGrant(value) ? value : null;
}
async function syncCompletedSession(snapshot: MonitorSessionSnapshot, report: ReturnType<typeof buildLocalReport>): Promise<boolean> {
  const grant = await readSyncGrant(); if (!grant) return false;
  return syncAggregate(grant, aggregateForSync(snapshot, report));
}
async function fallbackJudge(input: Pick<Parameters<typeof judgeRelevance>[0], "category" | "allowed">): Promise<PolicyVerdict | null> {
  try {
    const response = await fetch(new URL("/api/extension/policy-judge", WEB_ORIGIN), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store" });
    const body = await response.json() as { verdict?: unknown }; return parseVerdict(body.verdict);
  } catch { return null; }
}
async function recordPolicyEvent(snapshot: MonitorSessionSnapshot, descriptor: PageDescriptor, verdict: "allow" | "warn" | "block" | "monitor", action: "none" | "recover" | "notice" | "audio" | "nudge" | "block", reason: string, contestable: boolean): Promise<string> {
  const id = crypto.randomUUID();
  await localDb.policyEvents.put({ id, sessionId: snapshot.id, at: new Date().toISOString(), category: descriptor.category, verdict, action, derivedSignal: verdict === "monitor" ? "judge_unavailable" : "local_category", policyReason: reason, contestPath: contestable ? `extension://contest/${id}` : "", contested: false });
  return id;
}
async function inspectNavigation(tabId: number, address: string): Promise<void> {
  const snapshot = await refresh(); if (!snapshot || snapshot.status !== "running" || snapshot.contract.tier === "monitor") return;
  const descriptor = describePageAddress(address, normalizeAllowedDomains(snapshot.contract.allowedHelp)); if (!descriptor) return;
  if (bypassTabs.delete(tabId)) return;
  if (cacheSessionId !== snapshot.id) { cache = new VerdictCache(); cacheSessionId = snapshot.id; ignoredByCategory.clear(); }
  let verdict = cache.get(snapshot.id, descriptor.category);
  let monitoringReason: string | null = null;
  if (!verdict) {
    const result = descriptor.allowed ? { mode: "verdict" as const, source: "on_device" as const, verdict: { decision: "allow" as const, reason: "explicitly_allowed", confidence: 1 } } : await judgeRelevance({ task: snapshot.contract.task, ...descriptor }, { onDevice: judgeWithNano, fallback: fallbackJudge });
    if (result.mode === "monitor") monitoringReason = result.reason;
    else { verdict = result.verdict; cache.set(snapshot.id, descriptor.category, verdict); }
  }
  if (!verdict) { await recordPolicyEvent(snapshot, descriptor, "monitor", "none", monitoringReason ?? "judge_unavailable", false); return; }
  const intervention = nextIntervention({ tier: snapshot.contract.tier, decision: verdict.decision, previousIgnores: ignoredByCategory.get(descriptor.category) ?? 0 });
  const eventId = await recordPolicyEvent(snapshot, descriptor, verdict.decision, intervention.action, intervention.reason || verdict.reason, intervention.contestable);
  if (verdict.decision === "allow") { ignoredByCategory.delete(descriptor.category); await browser.action.setBadgeText({ text: "" }); return; }
  ignoredByCategory.set(descriptor.category, (ignoredByCategory.get(descriptor.category) ?? 0) + 1);
  if (intervention.action === "notice") { await browser.action.setBadgeBackgroundColor({ color: "#d18a16" }); await browser.action.setBadgeText({ text: "!", tabId }); }
  if (intervention.action === "audio" || intervention.action === "nudge") { await ensureOffscreenDocument(); await browser.runtime.sendMessage({ type: "phase4:offscreen-tone", level: intervention.level }); }
  if (intervention.action === "block") { blockedTabs.set(tabId, eventId); await browser.tabs.update(tabId, { url: blockedPageUrl() }); }
}

async function stopLocalVision(reason?: string): Promise<void> {
  if (await browser.offscreen.hasDocument()) {
    await browser.runtime.sendMessage({ type: "phase3:offscreen-stop" }).catch(() => undefined);
    await browser.offscreen.closeDocument();
  }
  await browser.alarms.clear(ELIGIBILITY_ALARM);
  await browser.storage.local.set({ [VISION_STATUS_KEY]: { state: "idle", reason } satisfies VisionStatus });
}

async function startLocalVision(): Promise<{ ok: boolean; reason?: string }> {
  if (!await verifyCameraGrant()) {
    await stopLocalVision("Camera consent could not be verified. Generate a fresh setup code at /cam.");
    return { ok: false, reason: "consent_not_verified" };
  }
  try {
    await ensureOffscreenDocument();
    await browser.runtime.sendMessage({ type: "phase3:offscreen-start" });
    await browser.alarms.create(ELIGIBILITY_ALARM, { periodInMinutes: 1 });
    return { ok: true };
  } catch {
    await stopLocalVision("The browser could not start the local camera room.");
    return { ok: false, reason: "camera_unavailable" };
  }
}

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    await browser.storage.local.set({ "phase2:extension-version": 2, "phase3:extension-version": 3, "phase4:extension-version": 4, "phase1:camera-enabled": false });
    await browser.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true });
    await browser.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
    await browser.alarms.create(RETENTION_ALARM, { periodInMinutes: 24 * 60 });
    await pruneExpiredLocalData();
  });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) void serial(() => refresh());
    if (alarm.name === ELIGIBILITY_ALARM) void serial(async () => { if (!await verifyCameraGrant()) await stopLocalVision("Camera consent was withdrawn or expired."); });
    if (alarm.name === RETENTION_ALARM) void serial(() => pruneExpiredLocalData());
  });
  browser.tabs.onActivated.addListener(() => { void serial(() => update("TAB_SWITCH")); });
  browser.windows.onFocusChanged.addListener((windowId) => { void serial(() => update(windowId === browser.windows.WINDOW_ID_NONE ? "WINDOW_BLUR" : "WINDOW_FOCUS")); });
  browser.idle.onStateChanged.addListener((state) => { void serial(() => update(state === "active" ? "ACTIVE" : "IDLE")); });
  browser.tabs.onUpdated.addListener((tabId, changeInfo) => { if (typeof changeInfo.url === "string") void serial(() => inspectNavigation(tabId, changeInfo.url!)); });
  browser.runtime.onMessage.addListener((message: Message) => serial(async () => {
    if (message.type === "phase2:get-status") {
      const session = await refresh();
      const report = session?.status === "ended" ? await localDb.reports.get(session.id) : null;
      return { session, report: report?.report ?? null };
    }
    if (message.type === "phase2:start") {
      const issues = validateSessionContract(message.input);
      if (issues.length) return { ok: false, issues };
      const active = await refresh();
      if (active && active.status !== "ended") return { ok: false, issues: ["active_session"] };
      const contract = createSessionContract({ ...message.input, allowedHelp: normalizeAllowedDomains(message.input.allowedHelp).join(", ") || undefined });
      const session = createMonitorSession(contract);
      await persist(session, true);
      return { ok: true, session };
    }
    if (message.type === "phase2:action") return { ok: true, session: await update(message.action) };
    if (message.type === "phase2:open-dashboard") {
      await browser.tabs.create({ url: "/dashboard.html" });
      return { ok: true };
    }
    if (message.type === "phase3:get-camera-status") {
      const [grant, stored] = await Promise.all([readCameraGrant(), browser.storage.local.get(VISION_STATUS_KEY)]);
      return { grantEligible: Boolean(grant), status: (stored[VISION_STATUS_KEY] as VisionStatus | undefined) ?? { state: "idle" } };
    }
    if (message.type === "phase3:redeem-camera-code") {
      const result = await callEligibility({ action: "redeem", code: message.code.trim() });
      const grant = asGrant(result);
      if (!grant) return { ok: false, reason: "invalid_or_expired_code" };
      await browser.storage.local.set({ [CAMERA_GRANT_KEY]: grant, [VISION_STATUS_KEY]: { state: "idle" } satisfies VisionStatus });
      return { ok: true, expiresAt: grant.expiresAt };
    }
    if (message.type === "phase3:start-local-vision") return startLocalVision();
    if (message.type === "phase3:stop-local-vision") { await stopLocalVision("Stopped by you."); return { ok: true }; }
    if (message.type === "phase3:create-phone-offer") {
      if (!await verifyCameraGrant()) return { ok: false, reason: "consent_not_verified" };
      try { await ensureOffscreenDocument(); return await browser.runtime.sendMessage({ type: "phase3:offscreen-phone-offer" }) as { ok: boolean; offer?: string; reason?: string }; }
      catch { return { ok: false, reason: "pairing_unavailable" }; }
    }
    if (message.type === "phase3:accept-phone-answer") return await browser.runtime.sendMessage({ type: "phase3:offscreen-phone-answer", answer: message.answer }) as { ok: boolean; reason?: string };
    if (message.type === "phase3:vision-status") {
      await browser.storage.local.set({ [VISION_STATUS_KEY]: message.status });
      if (message.status.state === "error") await browser.alarms.clear(ELIGIBILITY_ALARM);
      return { ok: true };
    }
    if (message.type === "phase4:get-sync-status") { const grant = await readSyncGrant(); return { linked: Boolean(grant), expiresAt: grant?.expiresAt ?? null }; }
    if (message.type === "phase4:redeem-sync-code") {
      const grant = await redeemSyncCode(message.code); if (!grant) return { ok: false, reason: "invalid_or_expired_code" };
      await browser.storage.local.set({ [SYNC_GRANT_KEY]: grant }); return { ok: true, expiresAt: grant.expiresAt };
    }
    if (message.type === "phase4:sync-latest-report") {
      const session = await loadSnapshot(); if (!session || session.status !== "ended") return { ok: false, reason: "no_completed_session" };
      const report = await localDb.reports.get(session.id); if (!report) return { ok: false, reason: "no_report" };
      return { ok: await syncCompletedSession(session, report.report as ReturnType<typeof buildLocalReport>) };
    }
    if (message.type === "phase4:get-blocked-context") { const eventId = blockedTabs.get(message.tabId); const event = eventId ? await localDb.policyEvents.get(eventId) : null; return event ? { event: { category: event.category, reason: event.policyReason, contestPath: event.contestPath } } : { event: null }; }
    if (message.type === "phase4:contest") {
      const eventId = blockedTabs.get(message.tabId); if (eventId) await localDb.policyEvents.update(eventId, { contested: true });
      blockedTabs.delete(message.tabId); bypassTabs.add(message.tabId); await browser.tabs.goBack(message.tabId).catch(() => undefined); return { ok: true };
    }
    return undefined;
  }));
});
