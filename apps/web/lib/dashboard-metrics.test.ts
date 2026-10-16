import { describe, expect, it } from "vitest";
import { buildDashboardMetrics } from "./dashboard-metrics";

describe("dashboard metrics", () => {
  const now = new Date("2026-10-16T18:00:00.000Z");

  it("builds useful seven-day progress, comparison, and streak information from aggregates", () => {
    const metrics = buildDashboardMetrics([
      { id: "today", startedAt: "2026-10-16T15:00:00.000Z", endedAt: "2026-10-16T16:00:00.000Z", focusMinutes: 50, score: 90, violationCount: 1 },
      { id: "yesterday", startedAt: "2026-10-15T12:00:00.000Z", endedAt: "2026-10-15T13:40:00.000Z", focusMinutes: 70, score: 70, violationCount: 2 },
      { id: "previous-week", startedAt: "2026-10-08T12:00:00.000Z", endedAt: "2026-10-08T13:00:00.000Z", focusMinutes: 40, score: 50, violationCount: 0 },
    ], now);

    expect(metrics.focusedMinutes).toBe(120);
    expect(metrics.focusedMinutesChange).toBe(80);
    expect(metrics.averageScore).toBe(80);
    expect(metrics.focusRate).toBe(75);
    expect(metrics.currentStreak).toBe(2);
    expect(metrics.interventions).toBe(3);
    expect(metrics.days.map((day) => day.minutes).slice(-2)).toEqual([70, 50]);
  });

  it("keeps an empty account useful and avoids invented scores or rates", () => {
    const metrics = buildDashboardMetrics([], now);
    expect(metrics).toMatchObject({ focusedMinutes: 0, averageScore: null, focusRate: null, currentStreak: 0, interventions: 0 });
    expect(metrics.days).toHaveLength(7);
  });
});
