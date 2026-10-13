import { describe, expect, it } from "vitest";
import { createMonitorSession, transitionMonitorSession } from "./engine";

const contract = { id: "session-1", task: "Study calculus", durationMinutes: 20, tier: "monitor" as const, createdAt: "2026-10-12T12:00:00.000Z" };

describe("monitor session engine", () => {
  it("records focus and tab telemetry without storing page details", () => {
    let snapshot = createMonitorSession(contract, "2026-10-12T12:00:00.000Z");
    snapshot = transitionMonitorSession(snapshot, "TAB_SWITCH", "2026-10-12T12:05:00.000Z");
    snapshot = transitionMonitorSession(snapshot, "ACTIVE", "2026-10-12T12:07:00.000Z");
    snapshot = transitionMonitorSession(snapshot, "END", "2026-10-12T12:10:00.000Z");

    expect(snapshot.focusedMs).toBe(480_000);
    expect(snapshot.driftingMs).toBe(120_000);
    expect(snapshot.events.map((event) => event.type)).toEqual(["start", "tab_switch", "active", "end"]);
    expect(JSON.stringify(snapshot)).not.toMatch(/https?:\/\//);
  });

  it("reconciles a restored snapshot without counting the same interval twice", () => {
    const started = createMonitorSession(contract, "2026-10-12T12:00:00.000Z");
    const persisted = JSON.parse(JSON.stringify(started));
    const restored = transitionMonitorSession(persisted, "TICK", "2026-10-12T12:01:00.000Z");
    const again = transitionMonitorSession(restored, "TICK", "2026-10-12T12:01:00.000Z");
    expect(again.focusedMs).toBe(60_000);
    expect(again.events).toEqual([{ type: "start", at: "2026-10-12T12:00:00.000Z" }]);
  });

  it("ends exactly at the planned 20-minute active boundary", () => {
    const started = createMonitorSession(contract, "2026-10-12T12:00:00.000Z");
    const completed = transitionMonitorSession(started, "TICK", "2026-10-12T12:20:00.000Z");
    expect(completed.status).toBe("ended");
    expect(completed.activeMs).toBe(20 * 60_000);
    expect(completed.focusedMs + completed.driftingMs + completed.idleMs + completed.awayMs).toBe(completed.activeMs);
  });
});
