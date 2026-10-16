export type PasswordValidation =
  | { ok: true }
  | { ok: false; code: "too_short" | "too_long" | "missing_uppercase" | "missing_lowercase" | "missing_number" };

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;

export function validatePassword(password: string): PasswordValidation {
  if (password.length < PASSWORD_MIN_LENGTH) return { ok: false, code: "too_short" };
  if (password.length > PASSWORD_MAX_LENGTH) return { ok: false, code: "too_long" };
  if (!/[A-Z]/.test(password)) return { ok: false, code: "missing_uppercase" };
  if (!/[a-z]/.test(password)) return { ok: false, code: "missing_lowercase" };
  if (!/[0-9]/.test(password)) return { ok: false, code: "missing_number" };
  return { ok: true };
}

export function passwordValidationMessage(validation: PasswordValidation): string | null {
  if (validation.ok) return null;
  const messages: Record<Exclude<PasswordValidation, { ok: true }>['code'], string> = {
    too_short: "Use at least 12 characters.",
    too_long: "Use no more than 72 characters.",
    missing_uppercase: "Include at least one uppercase letter.",
    missing_lowercase: "Include at least one lowercase letter.",
    missing_number: "Include at least one number.",
  };
  return messages[validation.code];
}
