import { describe, expect, it } from "vitest";
import { initialVisionPerformanceState, recordInferenceTime } from "./performance";

describe("vision degradation ladder", () => {
  it("reduces work and eventually pauses rather than escalating resource use", () => {
    let state = initialVisionPerformanceState;
    for (let index = 0; index < 5; index += 1) state = recordInferenceTime(state, 120).state;
    expect(state.mode).toBe("reduced");
    for (let index = 0; index < 10; index += 1) state = recordInferenceTime(state, 300).state;
    expect(state.mode).toBe("paused");
  });
});
