import { createActor, createMachine } from "xstate";

/** Portable session lifecycle. Browser code owns persistence and clock accounting. */
export const sessionMachine = createMachine({
  id: "study-session",
  initial: "draft",
  states: {
    draft: { on: { START: "running" } },
    running: { on: { PAUSE: "paused", BREAK: "break", END: "ended" } },
    paused: { on: { RESUME: "running", END: "ended" } },
    break: { on: { RESUME: "running", END: "ended" } },
    ended: { type: "final" },
  },
});

export type SessionMachineEvent = { type: "START" | "PAUSE" | "RESUME" | "BREAK" | "END" };

export function initialSessionMachine() {
  const actor = createActor(sessionMachine).start();
  return actor.getSnapshot();
}

export type SessionMachineSnapshot = ReturnType<typeof initialSessionMachine>;

export function transitionSessionMachine(snapshot: SessionMachineSnapshot, event: SessionMachineEvent) {
  if (snapshot.status === "done") return snapshot;
  const actor = createActor(sessionMachine, { snapshot }).start();
  actor.send(event);
  return actor.getSnapshot();
}

export function persistSessionMachine(snapshot: SessionMachineSnapshot) {
  return createActor(sessionMachine, { snapshot }).getPersistedSnapshot();
}

export type PersistedSessionMachine = ReturnType<typeof persistSessionMachine>;

export function restoreSessionMachine(snapshot: PersistedSessionMachine) {
  return createActor(sessionMachine, { snapshot }).start().getSnapshot();
}
