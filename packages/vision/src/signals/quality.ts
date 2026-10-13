export type FrameQualityInput = Readonly<{ brightness: number; faceRatio: number; confidence: number }>;
export type FrameQuality = Readonly<{ usable: boolean; reason: "too_dark" | "face_too_small" | "low_confidence" | null }>;
export function assessFrameQuality(input: FrameQualityInput): FrameQuality {
  if (![input.brightness, input.faceRatio, input.confidence].every(Number.isFinite)) return { usable: false, reason: "low_confidence" };
  if (input.brightness < .1) return { usable: false, reason: "too_dark" };
  if (input.faceRatio < .08) return { usable: false, reason: "face_too_small" };
  if (input.confidence < .65) return { usable: false, reason: "low_confidence" };
  return { usable: true, reason: null };
}
