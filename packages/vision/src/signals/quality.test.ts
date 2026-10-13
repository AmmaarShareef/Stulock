import { describe, expect, it } from "vitest";
import { assessFrameQuality } from "./quality";

describe("frame quality", () => {
  it("fails safely for dark, tiny, or low-confidence face observations", () => {
    expect(assessFrameQuality({ brightness: .03, faceRatio: .2, confidence: .9 }).usable).toBe(false);
    expect(assessFrameQuality({ brightness: .5, faceRatio: .03, confidence: .9 }).usable).toBe(false);
    expect(assessFrameQuality({ brightness: .5, faceRatio: .2, confidence: .2 }).usable).toBe(false);
    expect(assessFrameQuality({ brightness: .5, faceRatio: .2, confidence: .9 }).usable).toBe(true);
  });
});
