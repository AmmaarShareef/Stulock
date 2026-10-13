import { describe, expect, it } from "vitest";
import { initialSessionMachine, persistSessionMachine, restoreSessionMachine, transitionSessionMachine } from "./session";

describe("session machine", () => {
  it("permits only the legal session lifecycle", () => {
    const draft = initialSessionMachine();
    expect(transitionSessionMachine(draft, { type: "PAUSE" }).value).toBe("draft");

    const running = transitionSessionMachine(draft, { type: "START" });
    const paused = transitionSessionMachine(running, { type: "PAUSE" });
    const resumed = transitionSessionMachine(paused, { type: "RESUME" });
    const ended = transitionSessionMachine(resumed, { type: "END" });

    expect([running.value, paused.value, resumed.value, ended.value]).toEqual(["running", "paused", "running", "ended"]);
    expect(transitionSessionMachine(ended, { type: "START" }).value).toBe("ended");
  });

  it("restores a persisted running snapshot without resetting it to draft", () => {
    const running = transitionSessionMachine(initialSessionMachine(), { type: "START" });
    const restored = restoreSessionMachine(persistSessionMachine(running));
    expect(restored.value).toBe("running");
  });
});
