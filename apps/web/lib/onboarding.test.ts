import { describe, expect, it } from "vitest";
import { ONBOARDING_CONSENT_VERSION, validateOnboarding } from "./onboarding";

describe("onboarding validation", () => {
  const valid = { birthDate: "2000-04-12", acceptsPrivacy: true, acceptsBiometricConsent: true, consentVersion: ONBOARDING_CONSENT_VERSION };

  it("allows an adult who gave both explicit consents", () => {
    expect(validateOnboarding(valid, new Date("2026-10-06"))).toEqual({ ok: true });
  });

  it("rejects users who have not reached the minimum age", () => {
    expect(validateOnboarding({ ...valid, birthDate: "2014-10-07" }, new Date("2026-10-06"))).toMatchObject({ ok: false, code: "underage" });
  });

  it("rejects missing or bundled consent", () => {
    expect(validateOnboarding({ ...valid, acceptsBiometricConsent: false }, new Date("2026-10-06"))).toMatchObject({ ok: false, code: "biometric_consent_required" });
    expect(validateOnboarding({ ...valid, consentVersion: "old" }, new Date("2026-10-06"))).toMatchObject({ ok: false, code: "consent_version_invalid" });
  });
});
