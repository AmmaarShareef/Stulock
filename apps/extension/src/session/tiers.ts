import type { SessionTier } from "@stulock/core";

export type TierPolicy = Readonly<{ recordsTelemetry: true; blocksPages: boolean; playsAudio: boolean; label: string }>;

/** Phase 4 keeps monitor-only passive; higher self-selected tiers escalate proportionally. */
export function tierPolicy(tier: SessionTier): TierPolicy {
  const labels: Record<SessionTier, string> = {
    monitor: "Monitor only",
    light: "Light — visual reminders",
    average: "Average — reminders and repeated-page block",
    locked: "Locked in — block high-confidence distractions",
  };
  return { recordsTelemetry: true, blocksPages: tier === "average" || tier === "locked", playsAudio: tier === "average" || tier === "locked", label: labels[tier] };
}
