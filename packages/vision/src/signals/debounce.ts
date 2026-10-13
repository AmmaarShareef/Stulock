export type DebouncedState = Readonly<{ active: boolean; positiveFrames: number; negativeFrames: number }>;

/** Converts noisy per-frame detector output into a stable, reversible state. */
export function nextDebounced(state: DebouncedState, observed: boolean, options: Readonly<{ activateAfter: number; clearAfter: number }>): DebouncedState {
  if (options.activateAfter < 1 || options.clearAfter < 1) throw new Error("Debounce thresholds must be positive.");
  if (observed) {
    const positiveFrames = state.positiveFrames + 1;
    return { active: state.active || positiveFrames >= options.activateAfter, positiveFrames, negativeFrames: 0 };
  }
  const negativeFrames = state.negativeFrames + 1;
  return { active: state.active && negativeFrames < options.clearAfter, positiveFrames: 0, negativeFrames };
}
