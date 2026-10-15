import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyStripeSignature } from "./stripe-webhook";

describe("Stripe webhook verification", () => {
  it("accepts a recent payload signed with the configured endpoint secret", () => {
    const body = '{"type":"customer.subscription.updated"}'; const timestamp = "1760529600"; const secret = "whsec_test";
    const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
    expect(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`, secret, 1760529600_000)).toBe(true);
  });
  it("rejects altered, stale, or unsigned payloads", () => {
    expect(verifyStripeSignature("{}", "t=1760529600,v1=deadbeef", "whsec_test", 1760529600_000)).toBe(false);
    expect(verifyStripeSignature("{}", "t=1,v1=deadbeef", "whsec_test", 1760529600_000)).toBe(false);
  });
});
