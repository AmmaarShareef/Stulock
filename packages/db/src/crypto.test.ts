import { describe, expect, it } from "vitest";
import { decryptSecret, destroyKey, encryptSecret, generateBiometricKey } from "./crypto";

describe("biometric-key encryption", () => {
  it("decrypts only with the original non-extractable key", async () => {
    const key = await generateBiometricKey();
    expect(key.extractable).toBe(false);
    const encrypted = await encryptSecret(key, "face-template");
    await expect(decryptSecret(key, encrypted)).resolves.toBe("face-template");
  });

  it("makes encrypted data unreadable after key destruction", async () => {
    const key = await generateBiometricKey();
    const encrypted = await encryptSecret(key, "face-template");
    const destroyed = destroyKey();
    await expect(decryptSecret(destroyed, encrypted)).rejects.toThrow("Biometric key is unavailable");
  });
});
