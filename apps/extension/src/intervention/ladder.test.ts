import { describe, expect, it } from "vitest";
import { nextIntervention } from "./ladder";

describe("Phase 4 intervention ladder", () => {
  it("suppresses every intervention in monitor-only sessions", () => {
    expect(nextIntervention({ tier: "monitor", decision: "block", previousIgnores: 4 })).toMatchObject({ action: "none", reason: "monitor_only" });
  });

  it("escalates proportionally and recovers after compliant activity", () => {
    expect(nextIntervention({ tier: "light", decision: "warn", previousIgnores: 0 })).toMatchObject({ action: "notice", level: 1 });
    expect(nextIntervention({ tier: "average", decision: "warn", previousIgnores: 1 })).toMatchObject({ action: "audio", level: 2 });
    expect(nextIntervention({ tier: "locked", decision: "block", previousIgnores: 0 })).toMatchObject({ action: "block", level: 4, contestable: true });
    expect(nextIntervention({ tier: "locked", decision: "allow", previousIgnores: 4 })).toMatchObject({ action: "recover", level: 0 });
  });
});
