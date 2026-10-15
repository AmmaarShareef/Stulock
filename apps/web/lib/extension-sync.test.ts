import { describe, expect, it } from "vitest";
import { validateAggregateSession } from "./extension-sync";

describe("extension aggregate-session sync", () => {
  it("accepts only bounded aggregate metrics", () => {
    expect(validateAggregateSession({ sessionId: "1b38fbca-4836-440c-93c4-6f03b84d9adc", startedAt: "2026-10-15T12:00:00.000Z", endedAt: "2026-10-15T12:25:00.000Z", focusMinutes: 20, score: 80, violationCount: 2 })).toMatchObject({ ok: true });
  });

  it("rejects identity fields, page data, and out-of-range values", () => {
    expect(validateAggregateSession({ sessionId: "1b38fbca-4836-440c-93c4-6f03b84d9adc", startedAt: "now", endedAt: "later", focusMinutes: -1, score: 101, violationCount: 0, url: "https://private.example" })).toEqual({ ok: false, reason: "invalid_payload" });
  });
});
