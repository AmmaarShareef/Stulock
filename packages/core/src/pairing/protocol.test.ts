import { describe, expect, it } from "vitest";
import { createPairingOffer, decodePhonePairAnswer, decodePhonePairOffer, encodePhonePairAnswer, encodePhonePairOffer, validatePairingOffer } from "./protocol";

describe("phone pairing protocol", () => {
  it("rejects expired and mismatched offers before a media stream can start", () => {
    const offer = createPairingOffer("2026-10-13T12:00:00.000Z", () => .123456);
    expect(validatePairingOffer(offer, offer.code, "2026-10-13T12:04:59.000Z").ok).toBe(true);
    expect(validatePairingOffer(offer, "000000", "2026-10-13T12:01:00.000Z").ok).toBe(false);
    expect(validatePairingOffer(offer, offer.code, "2026-10-13T12:05:01.000Z").ok).toBe(false);
  });

  it("round-trips typed offers and answers without a signalling service", () => {
    const offer = { version: 1 as const, ...createPairingOffer("2026-10-13T12:00:00.000Z", () => .123456), description: { type: "offer" as const, sdp: "offer-sdp" } };
    const answer = { version: 1 as const, code: offer.code, description: { type: "answer" as const, sdp: "answer-sdp" } };
    expect(decodePhonePairOffer(encodePhonePairOffer(offer))).toEqual(offer);
    expect(decodePhonePairAnswer(encodePhonePairAnswer(answer))).toEqual(answer);
  });
});
