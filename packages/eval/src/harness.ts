import { scoreSession } from "@stulock/core";

export type ReplayMonitorEvent = Readonly<{ type: "start" | "tab_switch" | "window_blur" | "active" | "idle" | "end"; at: string }>;

/** Deterministic, browser-free replay of the derived Phase 2 event stream. */
export function replayMonitorTelemetry(events: readonly ReplayMonitorEvent[]) {
  if (!events.length || events[0]!.type !== "start") throw new Error("A replay must start with a session start event.");
  let attention: "focused" | "drifting" | "away" | "idle" = "focused";
  let previous = Date.parse(events[0]!.at);
  let focusedMs = 0; let driftingMs = 0; let awayMs = 0; let idleMs = 0; let tabSwitches = 0;
  for (const event of events.slice(1)) {
    const at = Date.parse(event.at);
    const delta = Math.max(0, at - previous);
    if (attention === "focused") focusedMs += delta;
    else if (attention === "drifting") driftingMs += delta;
    else if (attention === "away") awayMs += delta;
    else idleMs += delta;
    if (event.type === "tab_switch") { attention = "drifting"; tabSwitches += 1; }
    else if (event.type === "window_blur") attention = "away";
    else if (event.type === "idle") attention = "idle";
    else if (event.type === "active") attention = "focused";
    previous = at;
  }
  const activeMs = focusedMs + driftingMs + awayMs + idleMs;
  return { focusedMs, driftingMs, awayMs, idleMs, activeMs, tabSwitches, score: scoreSession({ focusedMs, driftingMs, awayMs, idleMs, activeMs, tabSwitches }).score };
}
