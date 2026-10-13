import { describe, expect, it } from "vitest";
import { tierPolicy } from "./tiers";

describe("Phase 2 tier behavior", () => {
  it("records all tiers but suppresses blocks and interruptions", () => {
    for (const tier of ["monitor", "light", "average", "locked"] as const) {
      const policy = tierPolicy(tier);
      expect(policy.recordsTelemetry).toBe(true);
      expect(policy.blocksPages).toBe(false);
      expect(policy.playsAudio).toBe(false);
    }
  });
});
