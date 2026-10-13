export type EyeClosureSample = Readonly<{ at: number; closed: boolean }>;
export type FatigueState = Readonly<{ samples: readonly EyeClosureSample[] }>;
export type FatigueResult = Readonly<{ state: FatigueState; perclos: number; fatigued: boolean }>;

const WINDOW_MS = 60_000;
const MIN_SAMPLES = 15;
const FATIGUE_THRESHOLD = 0.4;

/** PERCLOS is only a break-suggestion signal; it never causes an intervention itself. */
export function nextFatigue(state: FatigueState, sample: EyeClosureSample): FatigueResult {
  if (!Number.isFinite(sample.at)) throw new Error("Eye-closure timestamps must be finite.");
  const cutoff = sample.at - WINDOW_MS;
  const samples = [...state.samples.filter((item) => item.at >= cutoff), sample].slice(-900);
  const perclos = samples.length ? samples.filter((item) => item.closed).length / samples.length : 0;
  return { state: { samples }, perclos, fatigued: samples.length >= MIN_SAMPLES && perclos >= FATIGUE_THRESHOLD };
}
