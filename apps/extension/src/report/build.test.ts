import { describe, expect, it } from "vitest";
import { createMonitorSession, transitionMonitorSession } from "../session/engine";
import { buildLocalReport } from "./build";

describe("local report", () => {
  it("creates a useful timeline from derived local telemetry only", () => {
    const contract = { id: "report-1", task: "Read notes", durationMinutes: 25, tier: "monitor" as const, createdAt: "2026-10-12T12:00:00.000Z" };
    let session = createMonitorSession(contract, "2026-10-12T12:00:00.000Z");
    session = transitionMonitorSession(session, "WINDOW_BLUR", "2026-10-12T12:02:00.000Z");
    session = transitionMonitorSession(session, "END", "2026-10-12T12:04:00.000Z");
    const report = buildLocalReport(session);

    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.timeline).toHaveLength(2);
    expect(Object.keys(report)).not.toEqual(expect.arrayContaining(["url", "title", "camera"]));
    expect(JSON.stringify(report)).not.toMatch(/https?:\/\//i);
  });
});
