import { describe, expect, it } from "vitest";
import { initialAttentionMachine, transitionAttentionMachine } from "./attention";

describe("attention machine", () => {
  it("moves between derived attention states and rejects unknown events", () => {
    const focused = initialAttentionMachine();
    const drifting = transitionAttentionMachine(focused, { type: "TAB_SWITCH" });
    const away = transitionAttentionMachine(drifting, { type: "WINDOW_BLUR" });
    const returned = transitionAttentionMachine(away, { type: "ACTIVE" });

    expect([focused.value, drifting.value, away.value, returned.value]).toEqual(["focused", "drifting", "away", "focused"]);
    expect(transitionAttentionMachine(returned, { type: "UNKNOWN" } as never).value).toBe("focused");
  });
});
