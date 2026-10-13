import { describe, expect, it } from "vitest";
import { nextPresence } from "./presence";

describe("presence hysteresis", () => {
  it("requires sustained evidence before changing presence", () => {
    let state = { present: true, missingFrames: 0, presentFrames: 0 };
    state = nextPresence(state, false); state = nextPresence(state, false);
    expect(state.present).toBe(true);
    state = nextPresence(state, false);
    expect(state.present).toBe(false);
    state = nextPresence(state, true);
    expect(state.present).toBe(false);
    state = nextPresence(state, true);
    expect(state.present).toBe(true);
  });
});
