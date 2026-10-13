export type CameraGrant = Readonly<{ grantId: string; renewalSecret: string; expiresAt: string }>;

/** A camera stream is never opened from a stale, malformed, or expired grant. */
export function canUseCameraGrant(grant: CameraGrant | null | undefined, now = new Date()): boolean {
  if (!grant || !/^[0-9a-f-]{36}$/i.test(grant.grantId) || grant.renewalSecret.length < 32) return false;
  const expiresAt = Date.parse(grant.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt > now.getTime();
}

export function normalizedWebOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && url.hostname === "localhost")) return null;
    return url.origin;
  } catch {
    return null;
  }
}
