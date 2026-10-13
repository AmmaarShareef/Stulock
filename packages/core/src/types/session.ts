export const SESSION_TIERS = ["monitor", "light", "average", "locked"] as const;
export type SessionTier = (typeof SESSION_TIERS)[number];

export type SessionContractInput = {
  task: string;
  durationMinutes: number;
  tier: SessionTier;
  allowedHelp?: string;
};

export type SessionContract = Readonly<SessionContractInput & {
  id: string;
  createdAt: string;
}>;

export const ATTENTION_STATES = ["focused", "writing", "drifting", "idle", "away", "violating"] as const;
export type AttentionState = (typeof ATTENTION_STATES)[number];

/**
 * These events intentionally contain no URL, title, DOM content, image, or audio.
 * They are safe to persist only on the user's device during the monitor-only phase.
 */
export const MONITOR_EVENT_TYPES = ["start", "pause", "resume", "break_start", "break_end", "tab_switch", "window_blur", "window_focus", "idle", "active", "end"] as const;
export type MonitorEventType = (typeof MONITOR_EVENT_TYPES)[number];

export type MonitorTimelineEvent = Readonly<{ type: MonitorEventType; at: string }>;
