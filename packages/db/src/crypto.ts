// Non-extractable AES-GCM CryptoKey generated at enrolment and stored in IndexedDB.
// Raw key material is never exposed to JavaScript, not even ours.
// DELETING THIS KEY IS THE DESTRUCTION SCHEDULE. Spec: 07, 12.

export type EncryptedSecret = Readonly<{ ciphertext: ArrayBuffer; iv: Uint8Array }>;

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error("WebCrypto is unavailable in this environment");
  return globalThis.crypto.subtle;
}

function requireKey(key: CryptoKey | null): CryptoKey {
  if (!key) throw new Error("Biometric key is unavailable");
  return key;
}

export async function generateBiometricKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(key: CryptoKey | null, plaintext: string): Promise<EncryptedSecret> {
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await subtle().encrypt({ name: "AES-GCM", iv }, requireKey(key), new TextEncoder().encode(plaintext));
  return { ciphertext, iv };
}

export async function decryptSecret(key: CryptoKey | null, encrypted: EncryptedSecret): Promise<string> {
  const plaintext = await subtle().decrypt({ name: "AES-GCM", iv: encrypted.iv }, requireKey(key), encrypted.ciphertext);
  return new TextDecoder().decode(plaintext);
}

/** A destroyed key is deliberately represented by null; it cannot be reconstructed. */
export function destroyKey(): null { return null; }
