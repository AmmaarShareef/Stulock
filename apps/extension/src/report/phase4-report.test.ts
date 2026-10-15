import { describe, expect, it } from "vitest";
import { buildLocalReport, type LocalPolicyEvent } from "./build";
import { createMonitorSession, transitionMonitorSession } from "../session/engine";

describe("Phase 4 explainable local reports", () => {
  it("includes a timestamp, derived signal, reason, and contest path without browsing data", () => {
    let session = createMonitorSession({ id: "phase4-report", task: "Read biology", durationMinutes: 20, tier: "locked", createdAt: "2026-10-15T12:00:00.000Z" }, "2026-10-15T12:00:00.000Z");
    session = transitionMonitorSession(session, "END", "2026-10-15T12:05:00.000Z");
    const events: LocalPolicyEvent[] = [{ id: "event-1", sessionId: session.id, at: "2026-10-15T12:02:00.000Z", category: "social", verdict: "block", action: "block", derivedSignal: "local_category", policyReason: "high_confidence_distraction", contestPath: "extension://contest/event-1", contested: false }];
    const report = buildLocalReport(session, events);
    expect(report.interventions[0]).toMatchObject({ at: events[0]!.at, derivedSignal: "local_category", policyReason: "high_confidence_distraction", contestPath: "extension://contest/event-1" });
    expect(JSON.stringify(report)).not.toMatch(/https?:\/\/|example\.com/i);
  });
});
