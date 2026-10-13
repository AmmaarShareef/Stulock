import { deriveVisionSignals, initialVisionSignalState, type DerivedVisionSignals, type VisionObservation } from "@stulock/vision";

export type VisionLabel = Readonly<Partial<Pick<DerivedVisionSignals, "present" | "phoneVisible" | "writing" | "fatigueSuggestion">>>;
export type VisionReplayFrame = Readonly<{ observation: VisionObservation; expected: VisionLabel }>;
export type BinaryMetrics = Readonly<{ truePositive: number; falsePositive: number; falseNegative: number; precision: number; recall: number }>;

function metrics(actual: readonly boolean[], expected: readonly boolean[]): BinaryMetrics {
  let truePositive = 0; let falsePositive = 0; let falseNegative = 0;
  for (let index = 0; index < actual.length; index += 1) {
    if (actual[index] && expected[index]) truePositive += 1;
    else if (actual[index] && !expected[index]) falsePositive += 1;
    else if (!actual[index] && expected[index]) falseNegative += 1;
  }
  return { truePositive, falsePositive, falseNegative, precision: truePositive + falsePositive ? truePositive / (truePositive + falsePositive) : 1, recall: truePositive + falseNegative ? truePositive / (truePositive + falseNegative) : 1 };
}

/** Deterministic replay takes already-labelled derived observations, never video clips. */
export function replayVisionObservations(frames: readonly VisionReplayFrame[]) {
  let state = initialVisionSignalState;
  const output: DerivedVisionSignals[] = [];
  for (const frame of frames) { const next = deriveVisionSignals(state, frame.observation); state = next.state; output.push(next.signals); }
  const fields = ["present", "phoneVisible", "writing", "fatigueSuggestion"] as const;
  const aggregate = Object.fromEntries(fields.map((field) => [field, metrics(output.map((signal) => signal[field]), frames.map((frame) => frame.expected[field] ?? false))])) as Record<(typeof fields)[number], BinaryMetrics>;
  return { signals: output, metrics: aggregate };
}
