export type PairingOffer = Readonly<{ code: string; createdAt: string; expiresAt: string }>;
export type SessionDescriptionWire = Readonly<{ type: "offer" | "answer"; sdp: string }>;
export type PhonePairOffer = Readonly<{ version: 1; code: string; createdAt: string; expiresAt: string; description: SessionDescriptionWire }>;
export type PhonePairAnswer = Readonly<{ version: 1; code: string; description: SessionDescriptionWire }>;

const TTL_MS = 5 * 60_000;
const encode = (value: unknown) => {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes));
};
const decode = (value: string): unknown => {
  const binary = atob(value.trim());
  return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (character) => character.codePointAt(0) ?? 0)));
};

export function createPairingOffer(now = new Date().toISOString(), random = Math.random): PairingOffer {
  const created = Date.parse(now);
  if (!Number.isFinite(created)) throw new Error("Invalid pairing time.");
  const code = String(Math.floor(random() * 1_000_000)).padStart(6, "0");
  return { code, createdAt: now, expiresAt: new Date(created + TTL_MS).toISOString() };
}

export function validatePairingOffer(offer: PairingOffer, code: string, now = new Date().toISOString()): { ok: boolean; reason?: "expired" | "mismatch" } {
  if (Date.parse(now) > Date.parse(offer.expiresAt)) return { ok: false, reason: "expired" };
  if (code !== offer.code) return { ok: false, reason: "mismatch" };
  return { ok: true };
}

export function encodePhonePairOffer(offer: PhonePairOffer): string { return encode(offer); }
export function encodePhonePairAnswer(answer: PhonePairAnswer): string { return encode(answer); }

function isDescription(value: unknown): value is SessionDescriptionWire {
  return Boolean(value) && typeof value === "object" && ((value as { type?: unknown }).type === "offer" || (value as { type?: unknown }).type === "answer") && typeof (value as { sdp?: unknown }).sdp === "string";
}

export function decodePhonePairOffer(value: string): PhonePairOffer | null {
  try {
    const parsed = decode(value) as Partial<PhonePairOffer>;
    return parsed.version === 1 && typeof parsed.code === "string" && typeof parsed.createdAt === "string" && typeof parsed.expiresAt === "string" && isDescription(parsed.description) && parsed.description.type === "offer" ? parsed as PhonePairOffer : null;
  } catch { return null; }
}

export function decodePhonePairAnswer(value: string): PhonePairAnswer | null {
  try {
    const parsed = decode(value) as Partial<PhonePairAnswer>;
    return parsed.version === 1 && typeof parsed.code === "string" && isDescription(parsed.description) && parsed.description.type === "answer" ? parsed as PhonePairAnswer : null;
  } catch { return null; }
}
