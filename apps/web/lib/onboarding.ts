export const ONBOARDING_CONSENT_VERSION = "2026-10-06";
export type OnboardingInput = { birthDate: string; acceptsPrivacy: boolean; acceptsBiometricConsent: boolean; consentVersion: string };
export type OnboardingResult = { ok: true } | { ok: false; code: "birth_date_invalid" | "underage" | "privacy_consent_required" | "biometric_consent_required" | "consent_version_invalid" };

export function validateOnboarding(input: OnboardingInput, today = new Date()): OnboardingResult {
  if (input.consentVersion !== ONBOARDING_CONSENT_VERSION) return { ok: false, code: "consent_version_invalid" };
  if (!input.acceptsPrivacy) return { ok: false, code: "privacy_consent_required" };
  if (!input.acceptsBiometricConsent) return { ok: false, code: "biometric_consent_required" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.birthDate)) return { ok: false, code: "birth_date_invalid" };
  const birthDate = new Date(`${input.birthDate}T00:00:00Z`);
  if (Number.isNaN(birthDate.getTime()) || birthDate > today) return { ok: false, code: "birth_date_invalid" };
  const minimum = new Date(Date.UTC(today.getUTCFullYear() - 13, today.getUTCMonth(), today.getUTCDate()));
  if (birthDate > minimum) return { ok: false, code: "underage" };
  return { ok: true };
}
