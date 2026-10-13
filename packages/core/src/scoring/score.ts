export type PersonalBaseline = Readonly<{ focusRatio: number; samples: number }>;
export type ScoreInput = Readonly<{ focusedMs: number; driftingMs?: number; idleMs?: number; awayMs?: number; activeMs: number; tabSwitches: number }>;
export type ScoreResult = Readonly<{ score: number; focusRatio: number; baselineDelta: number | null; accountedMs: number }>;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function calibrateBaseline(history: readonly number[]): PersonalBaseline {
  const valid = history.filter((value) => Number.isFinite(value) && value >= 0 && value <= 1).sort((a, b) => a - b);
  if (!valid.length) return { focusRatio: 0, samples: 0 };
  const midpoint = Math.floor(valid.length / 2);
  const focusRatio = valid.length % 2 ? valid[midpoint]! : (valid[midpoint - 1]! + valid[midpoint]!) / 2;
  return { focusRatio, samples: valid.length };
}

export function scoreSession(input: ScoreInput, baseline?: PersonalBaseline): ScoreResult {
  const activeMs = Math.max(0, input.activeMs);
  if (!activeMs) return { score: 0, focusRatio: 0, baselineDelta: baseline ? -baseline.focusRatio : null, accountedMs: 0 };
  // A partial stream must not become a perfect score. Active time is the denominator;
  // stateTotal is retained only as a sanity check against double-counted state buckets.
  const accountedMs = activeMs;
  const focusRatio = clamp(Math.max(0, input.focusedMs) / accountedMs, 0, 1);
  const switchPenalty = Math.min(12, Math.max(0, input.tabSwitches) * 2);
  const score = Math.round(clamp(focusRatio * 100 - switchPenalty, 0, 100));
  return { score, focusRatio, baselineDelta: baseline ? Number((focusRatio - baseline.focusRatio).toFixed(3)) : null, accountedMs };
}
