import { describe, expect, it } from "vitest";
import { addCalibrationSample, createCalibration, finalizeCalibration } from "./calibrate";

const features = Array.from({ length: 14 }, (_, index) => index / 20);
describe("gaze calibration", () => {
  it("rejects poor quality and incomplete calibrations", () => {
    const calibration = createCalibration();
    expect(addCalibrationSample(calibration, { target: { x: .5, y: .5 }, features, quality: 0.2 }).accepted).toBe(false);
    expect(finalizeCalibration(calibration)).toEqual({ ok: false, reason: "not_enough_samples" });
  });

  it("fits a stable local mapping after sufficient quality samples", () => {
    let calibration = createCalibration();
    for (let index = 0; index < 30; index += 1) calibration = addCalibrationSample(calibration, { target: { x: index % 2, y: (index >> 1) % 2 }, features: features.map((value, feature) => value + index * (feature + 1) / 100), quality: .9 }).calibration;
    expect(finalizeCalibration(calibration).ok).toBe(true);
  });
});
