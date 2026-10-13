import { describe, expect, it } from "vitest";
import { calibrateBaseline, scoreSession } from "./score";

describe("session scoring", () => {
  it("keeps every score within 0 through 100", () => {
    expect(scoreSession({ focusedMs: 100, activeMs: 0, tabSwitches: 0 }).score).toBe(0);
    expect(scoreSession({ focusedMs: 9_000, activeMs: 1_000, tabSwitches: 0 }).score).toBe(100);
  });

  it("calibrates to a personal baseline rather than a global threshold", () => {
    const baseline = calibrateBaseline([0.4, 0.5, 0.6]);
    expect(baseline.focusRatio).toBe(0.5);
    expect(scoreSession({ focusedMs: 500, activeMs: 1_000, tabSwitches: 0 }, baseline).baselineDelta).toBe(0);
  });

  it("does not double count attention durations", () => {
    const result = scoreSession({ focusedMs: 600, driftingMs: 600, idleMs: 600, awayMs: 600, activeMs: 1_000, tabSwitches: 0 });
    expect(result.accountedMs).toBe(1_000);
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
