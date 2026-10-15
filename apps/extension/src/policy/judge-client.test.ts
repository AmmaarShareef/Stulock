import { describe, expect, it } from "vitest";
import { VerdictCache } from "./cache";
import { judgeRelevance, parseVerdict } from "./judge-client";

describe("Phase 4 policy judge", () => {
  it("accepts only structured local verdicts", () => {
    expect(parseVerdict('{"decision":"warn","reason":"distraction_category","confidence":0.8}')).toEqual({ decision: "warn", reason: "distraction_category", confidence: 0.8 });
    expect(parseVerdict('{"decision":"block","reason":"x","confidence":2}')).toBeNull();
    expect(parseVerdict('block this page')).toBeNull();
  });

  it("keys the short-lived cache with the task and safe category, never an address", () => {
    const cache = new VerdictCache(() => 1000);
    cache.set("task-a", "social", { decision: "warn", reason: "distraction_category", confidence: 0.9 });
    expect(cache.get("task-a", "social")).toEqual({ decision: "warn", reason: "distraction_category", confidence: 0.9 });
    expect(JSON.stringify(cache)).not.toMatch(/https?:\/\//i);
  });

  it("falls back only when the on-device judge is unavailable", async () => {
    const result = await judgeRelevance({ task: "Read calculus", category: "video", allowed: false }, {
      onDevice: async () => null,
      fallback: async () => ({ decision: "warn", reason: "needs_review", confidence: 0.6 }),
    });
    expect(result).toEqual({ mode: "verdict", source: "server_fallback", verdict: { decision: "warn", reason: "needs_review", confidence: 0.6 } });
  });

  it("fails open into monitoring when every judge errors", async () => {
    const result = await judgeRelevance({ task: "Read calculus", category: "unknown", allowed: false }, {
      onDevice: async () => { throw new Error("unavailable"); },
      fallback: async () => { throw new Error("network"); },
    });
    expect(result).toEqual({ mode: "monitor", reason: "judge_unavailable" });
  });
});
