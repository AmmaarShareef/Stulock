import { describe, expect, it } from "vitest";
import { retentionCutoff } from "./local-data";

describe("Phase 5 local retention", () => {
  it("keeps detailed local telemetry for at most 90 rolling days", () => {
    expect(retentionCutoff(new Date("2026-10-15T12:00:00.000Z"))).toBe("2026-07-17T12:00:00.000Z");
  });
});
