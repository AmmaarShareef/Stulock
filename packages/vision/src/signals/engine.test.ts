import { describe, expect, it } from "vitest";
import { deriveVisionSignals, initialVisionSignalState } from "./engine";

const observation = (at: number, overrides: Partial<Parameters<typeof deriveVisionSignals>[1]> = {}) => ({
  at, brightness: .5, faceRatio: .2, faceConfidence: .9, faceDetected: true, eyeClosed: false, phoneDetected: false, handDetected: false, wristMotion: 0,
  ...overrides,
});

describe("derived vision signals", () => {
  it("debounces phone and writing detections without retaining an observation", () => {
    let state = initialVisionSignalState;
    let result = deriveVisionSignals(state, observation(0, { phoneDetected: true, handDetected: true, wristMotion: .03 })); state = result.state;
    expect(result.signals.phoneVisible).toBe(false);
    result = deriveVisionSignals(state, observation(66, { phoneDetected: true, handDetected: true, wristMotion: .03 })); state = result.state;
    expect(result.signals.phoneVisible).toBe(true);
    result = deriveVisionSignals(state, observation(132, { handDetected: true, wristMotion: .03 }));
    expect(result.signals.writing).toBe(true);
    expect(JSON.stringify(result.signals)).not.toMatch(/landmark|frame|image|video/i);
  });

  it("fails safely when a face is not usable", () => {
    const result = deriveVisionSignals(initialVisionSignalState, observation(0, { brightness: .01, faceDetected: true, phoneDetected: true }));
    expect(result.signals.quality.usable).toBe(false);
    expect(result.signals.phoneVisible).toBe(false);
  });
});
