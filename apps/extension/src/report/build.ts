import { scoreSession } from "@stulock/core";
import type { MonitorSessionSnapshot } from "../session/engine";

const labels: Record<string, string> = { start: "Session started", pause: "Session paused", resume: "Session resumed", break_start: "Break started", break_end: "Break ended", tab_switch: "Switched tabs", window_blur: "Study window lost focus", window_focus: "Study window returned", idle: "Device idle", active: "Activity resumed" };

export type LocalSessionReport = Readonly<{
  sessionId: string;
  task: string;
  tier: string;
  score: number;
  focusRatio: number;
  focusedMs: number;
  activeMs: number;
  breakMs: number;
  pausedMs: number;
  tabSwitches: number;
  timeline: readonly Readonly<{ at: string; label: string }>[];
  privacy: "Stored only on this device. No URLs, titles, camera data, or browsing history were collected.";
}>;

export function buildLocalReport(snapshot: MonitorSessionSnapshot): LocalSessionReport {
  const score = scoreSession({ focusedMs: snapshot.focusedMs, driftingMs: snapshot.driftingMs, idleMs: snapshot.idleMs, awayMs: snapshot.awayMs, activeMs: snapshot.activeMs, tabSwitches: snapshot.tabSwitches });
  return {
    sessionId: snapshot.id, task: snapshot.contract.task, tier: snapshot.contract.tier, score: score.score, focusRatio: score.focusRatio,
    focusedMs: snapshot.focusedMs, activeMs: snapshot.activeMs, breakMs: snapshot.breakMs, pausedMs: snapshot.pausedMs, tabSwitches: snapshot.tabSwitches,
    timeline: snapshot.events.filter((event) => event.type !== "end").map((event) => ({ at: event.at, label: labels[event.type] ?? "Session event" })),
    privacy: "Stored only on this device. No URLs, titles, camera data, or browsing history were collected.",
  };
}
