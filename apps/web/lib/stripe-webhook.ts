import { createHmac, timingSafeEqual } from "node:crypto";

/** Verifies Stripe's timestamped v1 signature before JSON is parsed or persisted. */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, now = Date.now()): boolean {
  if (!header || !secret) return false;
  const parts = header.split(",").map((part) => part.split("=", 2)); const timestamp = parts.find(([key]) => key === "t")?.[1]; const signatures = parts.filter(([key]) => key === "v1").map(([, value]) => value).filter((value): value is string => Boolean(value));
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now - Number(timestamp) * 1000) > 5 * 60_000) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
  return signatures.some((signature) => signature.length === expected.length && timingSafeEqual(Buffer.from(signature), Buffer.from(expected)));
}
