import { createSessionContract, validateSessionContract } from "../src/session/contract";
import { normalizeAllowedDomains } from "../src/session/allowlist";
import { createMonitorSession, transitionMonitorSession, type MonitorAction, type MonitorSessionSnapshot } from "../src/session/engine";
import { buildLocalReport } from "../src/report/build";
import { localDb } from "@stulock/db";
import { browser } from "wxt/browser";
import { defineBackground } from "wxt/utils/define-background";

type ContractInput = { task: string; durationMinutes: number; tier: "monitor" | "light" | "average" | "locked"; allowedHelp?: string };
type Message = { type: "phase2:get-status" } | { type: "phase2:start"; input: ContractInput } | { type: "phase2:action"; action: Exclude<MonitorAction, "TICK"> } | { type: "phase2:open-dashboard" };
const SNAPSHOT_KEY = "phase2:monitor-session";
const ALARM_NAME = "phase2:session-heartbeat";
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

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(async () => {
    await browser.storage.local.set({ "phase2:extension-version": 2, "phase1:camera-enabled": false });
    await browser.sidePanel?.setPanelBehavior({ openPanelOnActionClick: true });
    await browser.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  });
  browser.alarms.onAlarm.addListener((alarm) => { if (alarm.name === ALARM_NAME) void serial(() => refresh()); });
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
    return undefined;
  }));
});
