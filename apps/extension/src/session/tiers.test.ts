import { describe, expect, it } from "vitest";
import { tierPolicy } from "./tiers";

describe("Phase 4 tier behavior", () => {
  it("keeps monitor-only passive while only self-selected higher tiers may escalate", () => {
    expect(tierPolicy("monitor")).toMatchObject({ recordsTelemetry: true, blocksPages: false, playsAudio: false });
    expect(tierPolicy("light")).toMatchObject({ blocksPages: false, playsAudio: false });
    expect(tierPolicy("average")).toMatchObject({ blocksPages: true, playsAudio: true });
    expect(tierPolicy("locked")).toMatchObject({ blocksPages: true, playsAudio: true });
  });
});
