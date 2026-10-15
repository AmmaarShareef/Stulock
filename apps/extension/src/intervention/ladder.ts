import type { PolicyDecision } from "../policy/cache";
import type { SessionTier } from "@stulock/core";

export type InterventionAction = "none" | "recover" | "notice" | "audio" | "nudge" | "block";
export type LadderIntervention = Readonly<{ action: InterventionAction; level: 0 | 1 | 2 | 3 | 4; reason: string; contestable: boolean }>;

/** The strictest action is still self-imposed, explainable, and contestable. */
export function nextIntervention(input: Readonly<{ tier: SessionTier; decision: PolicyDecision; previousIgnores: number }>): LadderIntervention {
  if (input.tier === "monitor") return { action: "none", level: 0, reason: "monitor_only", contestable: false };
  if (input.decision === "allow") return { action: "recover", level: 0, reason: "relevance_recovered", contestable: false };
  const ignores = Math.max(0, input.previousIgnores);
  if (input.decision === "block" && input.tier === "locked") return { action: "block", level: 4, reason: "high_confidence_distraction", contestable: true };
  if (input.tier === "average" && ignores >= 2) return { action: "block", level: 4, reason: "repeated_distraction", contestable: true };
  if (input.tier === "locked" && ignores >= 1) return { action: "nudge", level: 3, reason: "repeated_distraction", contestable: false };
  if (input.tier !== "light" && ignores >= 1) return { action: "audio", level: 2, reason: "distraction_reminder", contestable: false };
  return { action: "notice", level: 1, reason: "relevance_check", contestable: false };
}
