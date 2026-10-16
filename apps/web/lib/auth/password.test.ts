import { describe, expect, it } from "vitest";
import { validatePassword } from "./password";

describe("password validation", () => {
  it("accepts a long password with varied character classes", () => {
    expect(validatePassword("StudyingIsBetter2026")).toEqual({ ok: true });
  });

  it("rejects weak, short, and overly long passwords before they reach Auth", () => {
    expect(validatePassword("short")).toMatchObject({ ok: false, code: "too_short" });
    expect(validatePassword("alllowercasepassword")).toMatchObject({ ok: false, code: "missing_uppercase" });
    expect(validatePassword("A".repeat(73) + "1a")).toMatchObject({ ok: false, code: "too_long" });
  });
});
