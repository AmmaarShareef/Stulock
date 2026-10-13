export type VisionPerformanceState = Readonly<{ frameCount: number; meanInferenceMs: number; mode: "full" | "reduced" | "paused" }>;
export type VisionPerformanceSample = Readonly<{ mode: VisionPerformanceState["mode"]; meanInferenceMs: number; frameCount: number }>;
export const initialVisionPerformanceState: VisionPerformanceState = { frameCount: 0, meanInferenceMs: 0, mode: "full" };

/** Degrades gracefully rather than increasing camera resolution or transmitting data. */
export function recordInferenceTime(state: VisionPerformanceState, inferenceMs: number): { state: VisionPerformanceState; sample: VisionPerformanceSample } {
  if (!Number.isFinite(inferenceMs) || inferenceMs < 0) throw new Error("Inference time must be a finite positive number.");
  const frameCount = state.frameCount + 1;
  const meanInferenceMs = state.frameCount === 0 ? inferenceMs : state.meanInferenceMs * 0.8 + inferenceMs * 0.2;
  const mode: VisionPerformanceState["mode"] = meanInferenceMs > 180 ? "paused" : meanInferenceMs > 70 ? "reduced" : "full";
  const next = { frameCount, meanInferenceMs, mode };
  return { state: next, sample: next };
}
