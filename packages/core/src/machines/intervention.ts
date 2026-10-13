import { createMachine } from "xstate";
import type { SessionTier } from "../types/session";

export const interventionMachine = createMachine({
  id: "intervention",
  initial: "quiet",
  states: {
    quiet: { on: { NOTICE: "recording" } },
    recording: { on: { RECOVER: "quiet" } },
  },
});

export type Intervention = Readonly<{ kind: "none" | "record"; reason: "monitor_only" | "phase2_local_record"; audible?: false; block?: false }>;

/** Phase 2 is observability only: every tier records locally and none can interrupt. */
export function interventionFor(tier: SessionTier, _signal: "tab_switch" | "window_blur"): Intervention {
  if (tier === "monitor") return { kind: "none", reason: "monitor_only" };
  return { kind: "record", reason: "phase2_local_record", audible: false, block: false };
}
