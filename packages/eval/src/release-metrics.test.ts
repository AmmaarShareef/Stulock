import { describe, expect, it } from "vitest";
import { assertReleaseMetrics, evaluateReleaseMetrics } from "./release-metrics";
import { phase5RegressionCorpus, syntheticInterventionEvidence } from "./fixtures/phase5-regression-corpus";

describe("Phase 5 release metrics", () => {
  it("requires every shipped intervention to remain below one false alarm per hour", () => {
    expect(phase5RegressionCorpus).toHaveLength(20);
    const metrics = evaluateReleaseMetrics(syntheticInterventionEvidence);
    expect(metrics.every((metric) => metric.falseAlarmsPerHour < 1)).toBe(true);
    expect(() => assertReleaseMetrics(metrics)).not.toThrow();
  });
  it("blocks release at the threshold or when evidence is missing", () => {
    expect(() => assertReleaseMetrics(evaluateReleaseMetrics([{ intervention: "policy_block", observedSeconds: 3_600, falseAlarms: 1 }]))).toThrow(/false alarms/i);
    expect(() => assertReleaseMetrics([])).toThrow(/evidence/i);
  });
});
