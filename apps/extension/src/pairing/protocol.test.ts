import { describe, expect, it } from "vitest";
import { createPairingOffer, validatePairingOffer } from "./protocol";

describe("phone pairing protocol", () => {
  it("rejects expired and mismatched pairing offers before a stream can start", () => {
    const offer = createPairingOffer("2026-10-13T12:00:00.000Z");
    expect(validatePairingOffer(offer, offer.code, "2026-10-13T12:04:59.000Z").ok).toBe(true);
    expect(validatePairingOffer(offer, "000000", "2026-10-13T12:01:00.000Z").ok).toBe(false);
    expect(validatePairingOffer(offer, offer.code, "2026-10-13T12:05:01.000Z").ok).toBe(false);
  });
});
