import { describe, expect, it } from "vitest";
import { createSessionContract, validateSessionContract } from "./contract";

describe("session contract", () => {
  it("requires a specific task and a bounded duration", () => {
    expect(validateSessionContract({ task: "", durationMinutes: 25, tier: "monitor" })).toContain("task");
    expect(validateSessionContract({ task: "Read chapter 3", durationMinutes: 0, tier: "monitor" })).toContain("durationMinutes");
  });

  it("creates immutable, monitor-only contracts by default", () => {
    const contract = createSessionContract({ task: "Read chapter 3", durationMinutes: 25, tier: "monitor" }, new Date("2026-10-06T12:00:00Z"));
    expect(contract.tier).toBe("monitor");
    expect(contract.createdAt).toBe("2026-10-06T12:00:00.000Z");
  });
});
