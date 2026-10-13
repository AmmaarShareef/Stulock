import { describe, expect, it } from "vitest";
import { interventionFor } from "./intervention";

describe("intervention policy", () => {
  it("never produces an intervention for a monitor-only session", () => {
    expect(interventionFor("monitor", "tab_switch")).toEqual({ kind: "none", reason: "monitor_only" });
  });

  it("keeps every Phase 2 tier non-blocking and non-audible", () => {
    for (const tier of ["light", "average", "locked"] as const) {
      const result = interventionFor(tier, "window_blur");
      expect(result.block).toBe(false);
      expect(result.audible).toBe(false);
    }
  });
});
