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
