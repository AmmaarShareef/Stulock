import type { AttentionState, MonitorEventType, MonitorTimelineEvent, SessionContract } from "@stulock/core";

export type MonitorSessionStatus = "running" | "paused" | "break" | "ended";
export type MonitorAction = "TICK" | "PAUSE" | "RESUME" | "BREAK_START" | "BREAK_END" | "TAB_SWITCH" | "WINDOW_BLUR" | "WINDOW_FOCUS" | "IDLE" | "ACTIVE" | "END";
export type MonitorSessionSnapshot = Readonly<{
  version: 1;
  id: string;
  contract: SessionContract;
  status: MonitorSessionStatus;
  attention: AttentionState;
  startedAt: string;
  updatedAt: string;
  endedAt?: string;
  activeMs: number;
  focusedMs: number;
  driftingMs: number;
  idleMs: number;
  awayMs: number;
  breakMs: number;
  pausedMs: number;
  tabSwitches: number;
  events: readonly MonitorTimelineEvent[];
}>;
type MutableMonitorSessionSnapshot = { -readonly [Key in keyof MonitorSessionSnapshot]: MonitorSessionSnapshot[Key] };

const eventFor: Record<Exclude<MonitorAction, "TICK">, MonitorEventType> = {
  PAUSE: "pause", RESUME: "resume", BREAK_START: "break_start", BREAK_END: "break_end", TAB_SWITCH: "tab_switch", WINDOW_BLUR: "window_blur", WINDOW_FOCUS: "window_focus", IDLE: "idle", ACTIVE: "active", END: "end",
};

const parse = (at: string) => Date.parse(at);
const validTime = (at: string) => Number.isFinite(parse(at));
const append = (snapshot: MonitorSessionSnapshot, type: MonitorEventType, at: string): MonitorSessionSnapshot => ({ ...snapshot, events: [...snapshot.events, { type, at }] });

export function createMonitorSession(contract: SessionContract, at = new Date().toISOString()): MonitorSessionSnapshot {
  if (!validTime(at)) throw new Error("Invalid session start time.");
  return { version: 1, id: contract.id, contract, status: "running", attention: "focused", startedAt: at, updatedAt: at, activeMs: 0, focusedMs: 0, driftingMs: 0, idleMs: 0, awayMs: 0, breakMs: 0, pausedMs: 0, tabSwitches: 0, events: [{ type: "start", at }] };
}

function accrue(snapshot: MonitorSessionSnapshot, at: string): MonitorSessionSnapshot {
  const current = parse(at);
  const previous = parse(snapshot.updatedAt);
  if (!Number.isFinite(current) || current <= previous || snapshot.status === "ended") return snapshot;
  let delta = current - previous;
  const next: MutableMonitorSessionSnapshot = { ...snapshot, updatedAt: at };
  if (snapshot.status === "running") {
    const remaining = Math.max(0, snapshot.contract.durationMinutes * 60_000 - snapshot.activeMs);
    delta = Math.min(delta, remaining);
    next.activeMs += delta;
    if (snapshot.attention === "focused" || snapshot.attention === "writing") next.focusedMs += delta;
    else if (snapshot.attention === "drifting" || snapshot.attention === "violating") next.driftingMs += delta;
    else if (snapshot.attention === "idle") next.idleMs += delta;
    else next.awayMs += delta;
  } else if (snapshot.status === "break") next.breakMs += delta;
  else if (snapshot.status === "paused") next.pausedMs += delta;
  return next;
}

function maybeComplete(snapshot: MonitorSessionSnapshot, at: string): MonitorSessionSnapshot {
  if (snapshot.status === "running" && snapshot.activeMs >= snapshot.contract.durationMinutes * 60_000) {
    return append({ ...snapshot, status: "ended", endedAt: at }, "end", at);
  }
  return snapshot;
}

export function transitionMonitorSession(snapshot: MonitorSessionSnapshot, action: MonitorAction, at = new Date().toISOString()): MonitorSessionSnapshot {
  if (!validTime(at)) return snapshot;
  let next = accrue(snapshot, at);
  if (action === "TICK") return maybeComplete(next, at);
  if (next.status === "ended") return next;

  if (action === "PAUSE" && next.status === "running") next = { ...next, status: "paused" };
  else if (action === "RESUME" && (next.status === "paused" || next.status === "break")) next = { ...next, status: "running", attention: "focused" };
  else if (action === "BREAK_START" && next.status === "running") next = { ...next, status: "break" };
  else if (action === "BREAK_END" && next.status === "break") next = { ...next, status: "running", attention: "focused" };
  else if (action === "TAB_SWITCH" && next.status === "running") next = { ...next, attention: "drifting", tabSwitches: next.tabSwitches + 1 };
  else if (action === "WINDOW_BLUR" && next.status === "running") next = { ...next, attention: "away" };
  else if (action === "WINDOW_FOCUS" && next.status === "running") next = { ...next, attention: "focused" };
  else if (action === "IDLE" && next.status === "running") next = { ...next, attention: "idle" };
  else if (action === "ACTIVE" && next.status === "running") next = { ...next, attention: "focused" };
  else if (action === "END") next = { ...next, status: "ended", endedAt: at };
  else return next;

  return maybeComplete(append(next, eventFor[action], at), at);
}
