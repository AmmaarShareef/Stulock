// Head yaw/pitch/roll + 8 eye-look blendshapes + 2 iris ratios + face scale.
export const FEATURE_COUNT = 14;
export type GazeFeatures = readonly number[] & { readonly length: 14 };

export type GazeFeatureInput = Readonly<{
  headYaw: number;
  headPitch: number;
  headRoll: number;
  eyeLook: Readonly<{
    leftDown: number;
    leftIn: number;
    leftOut: number;
    leftUp: number;
    rightDown: number;
    rightIn: number;
    rightOut: number;
    rightUp: number;
  }>;
  leftIrisRatio: number;
  rightIrisRatio: number;
  faceScale: number;
}>;

/** Produces the small numeric vector retained during local calibration. */
export function buildGazeFeatures(input: GazeFeatureInput): GazeFeatures {
  return normalizeFeatures([
    input.headYaw, input.headPitch, input.headRoll,
    input.eyeLook.leftDown, input.eyeLook.leftIn, input.eyeLook.leftOut, input.eyeLook.leftUp,
    input.eyeLook.rightDown, input.eyeLook.rightIn, input.eyeLook.rightOut, input.eyeLook.rightUp,
    input.leftIrisRatio, input.rightIrisRatio, input.faceScale,
  ]);
}

export function normalizeFeatures(values: readonly number[]): GazeFeatures {
  if (values.length !== FEATURE_COUNT) throw new Error(`Expected ${FEATURE_COUNT} gaze features.`);
  if (values.some((value) => !Number.isFinite(value))) throw new Error("Gaze features must be finite.");
  return Object.freeze([...values]) as GazeFeatures;
}
