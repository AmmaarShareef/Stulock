import { describe, expect, it } from "vitest";
import { FEATURE_COUNT, buildGazeFeatures, normalizeFeatures } from "./features";

describe("gaze features", () => {
  it("accepts only finite 14-value feature vectors", () => {
    expect(normalizeFeatures(Array.from({ length: FEATURE_COUNT }, (_, index) => index))).toHaveLength(FEATURE_COUNT);
    expect(() => normalizeFeatures([1, 2])).toThrow(/14/);
    expect(() => normalizeFeatures(Array.from({ length: FEATURE_COUNT }, () => Number.NaN))).toThrow(/finite/);
  });

  it("keeps gaze inputs in a fixed, testable order", () => {
    const features = buildGazeFeatures({ headYaw: 1, headPitch: 2, headRoll: 3, eyeLook: { leftDown: 4, leftIn: 5, leftOut: 6, leftUp: 7, rightDown: 8, rightIn: 9, rightOut: 10, rightUp: 11 }, leftIrisRatio: 12, rightIrisRatio: 13, faceScale: 14 });
    expect(features).toEqual(Array.from({ length: FEATURE_COUNT }, (_, index) => index + 1));
  });
});
