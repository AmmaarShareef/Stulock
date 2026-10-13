import { createSessionContract, validateSessionContract } from "../src/session/contract";
import { normalizeAllowedDomains } from "../src/session/allowlist";
import { createMonitorSession, transitionMonitorSession, type MonitorAction, type MonitorSessionSnapshot } from "../src/session/engine";
import { buildLocalReport } from "../src/report/build";
import { canUseCameraGrant, type CameraGrant } from "../src/vision/eligibility";
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
  | { type: "phase3:vision-status"; status: VisionStatus };
const SNAPSHOT_KEY = "phase2:monitor-session";
const ALARM_NAME = "phase2:session-heartbeat";
const CAMERA_GRANT_KEY = "phase3:camera-grant";
const VISION_STATUS_KEY = "phase3:vision-status";
const ELIGIBILITY_ALARM = "phase3:eligibility-heartbeat";
const WEB_ORIGIN = new URL(import.meta.env.WXT_PUBLIC_STULOCK_WEB_ORIGIN ?? "http://localhost:3000").origin;
let queue: Promise<void> = Promise.resolve();

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
    const report = buildLocalReport(snapshot);
    await localDb.reports.put({ id: snapshot.id, sessionId: snapshot.id, score: report.score, report, createdAt: snapshot.endedAt ?? snapshot.updatedAt });
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
  await browser.offscreen.createDocument({ url: "offscreen.html", reasons: ["USER_MEDIA"], justification: "Run user-authorized, on-device camera processing while the popup is closed." });
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
    await browser.storage.local.set({ "phase2:extension-version": 2, "phase3:extension-version": 3, "phase1:camera-enabled": false });
    await browser.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true });
    await browser.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM_NAME) void serial(() => refresh());
    if (alarm.name === ELIGIBILITY_ALARM) void serial(async () => { if (!await verifyCameraGrant()) await stopLocalVision("Camera consent was withdrawn or expired."); });
  });
  browser.tabs.onActivated.addListener(() => { void serial(() => update("TAB_SWITCH")); });
  browser.windows.onFocusChanged.addListener((windowId) => { void serial(() => update(windowId === browser.windows.WINDOW_ID_NONE ? "WINDOW_BLUR" : "WINDOW_FOCUS")); });
  browser.idle.onStateChanged.addListener((state) => { void serial(() => update(state === "active" ? "ACTIVE" : "IDLE")); });
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
    return undefined;
  }));
});
