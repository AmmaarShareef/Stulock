import { describe, expect, it } from "vitest";
import { replayMonitorTelemetry } from "./harness";

describe("synthetic monitor telemetry harness", () => {
  it("replays a focus and tab-switch stream deterministically", () => {
    const result = replayMonitorTelemetry([
      { type: "start", at: "2026-10-12T12:00:00.000Z" },
      { type: "tab_switch", at: "2026-10-12T12:05:00.000Z" },
      { type: "active", at: "2026-10-12T12:07:00.000Z" },
      { type: "end", at: "2026-10-12T12:10:00.000Z" },
    ]);
    expect(result.focusedMs).toBe(480_000);
    expect(result.tabSwitches).toBe(1);
  });
});
