import { createActor, createMachine } from "xstate";

// Six states, mutually exclusive, one per second. This is shared by reports and evals.
export const attentionMachine = createMachine({
  id: "attention",
  initial: "focused",
  states: {
    focused: { on: { WRITING: "writing", TAB_SWITCH: "drifting", IDLE: "idle", WINDOW_BLUR: "away", VIOLATION: "violating" } },
    writing: { on: { ACTIVE: "focused", TAB_SWITCH: "drifting", IDLE: "idle", WINDOW_BLUR: "away", VIOLATION: "violating" } },
    drifting: { on: { ACTIVE: "focused", WRITING: "writing", IDLE: "idle", WINDOW_BLUR: "away", VIOLATION: "violating" } },
    idle: { on: { ACTIVE: "focused", WRITING: "writing", WINDOW_BLUR: "away", VIOLATION: "violating" } },
    away: { on: { ACTIVE: "focused", WRITING: "writing", IDLE: "idle", VIOLATION: "violating" } },
    violating: { on: { ACTIVE: "focused", WINDOW_BLUR: "away" } },
  },
});

export type AttentionMachineEvent = { type: "WRITING" | "TAB_SWITCH" | "IDLE" | "WINDOW_BLUR" | "VIOLATION" | "ACTIVE" };
export function initialAttentionMachine() { return createActor(attentionMachine).start().getSnapshot(); }
export type AttentionMachineSnapshot = ReturnType<typeof initialAttentionMachine>;
export function transitionAttentionMachine(snapshot: AttentionMachineSnapshot, event: AttentionMachineEvent) {
  const actor = createActor(attentionMachine, { snapshot }).start();
  actor.send(event);
  return actor.getSnapshot();
}
