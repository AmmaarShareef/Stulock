import type { SessionTier } from "@stulock/core";

export type TierPolicy = Readonly<{ recordsTelemetry: true; blocksPages: false; playsAudio: false; label: string }>;

/** Tier choices prepare preferences for Phase 4 but remain monitor-only in Phase 2. */
export function tierPolicy(tier: SessionTier): TierPolicy {
  const labels: Record<SessionTier, string> = {
    monitor: "Monitor only",
    light: "Light — recording only in Phase 2",
    average: "Average — recording only in Phase 2",
    locked: "Locked in — recording only in Phase 2",
  };
  return { recordsTelemetry: true, blocksPages: false, playsAudio: false, label: labels[tier] };
}
