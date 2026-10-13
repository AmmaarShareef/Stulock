import { describe, expect, it } from "vitest";
import { replayVisionObservations } from "./vision-harness";

const frame = (at: number, phoneDetected = false) => ({ observation: { at, brightness: .5, faceRatio: .2, faceConfidence: .9, faceDetected: true, eyeClosed: false, phoneDetected, handDetected: false, wristMotion: 0 }, expected: { present: at >= 66, phoneVisible: phoneDetected && at >= 198 } });

describe("vision evaluation harness", () => {
  it("replays labelled derived observations deterministically and aggregates metrics", () => {
    const clip = [frame(0), frame(66), frame(132, true), frame(198, true)];
    const first = replayVisionObservations(clip);
    const second = replayVisionObservations(clip);
    expect(first.signals).toEqual(second.signals);
    expect(first.metrics.present.recall).toBe(1);
    expect(first.metrics.phoneVisible.precision).toBe(1);
  });
});
