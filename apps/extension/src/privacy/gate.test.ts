import { describe, expect, it } from "vitest";
import { canRequestCamera } from "./gate";
describe("camera gate", () => { it("requires both age-gate and separate biometric consent", () => { expect(canRequestCamera({ ageGatePassed: true, biometricConsentGiven: true })).toBe(true); expect(canRequestCamera({ ageGatePassed: true, biometricConsentGiven: false })).toBe(false); expect(canRequestCamera({ ageGatePassed: false, biometricConsentGiven: true })).toBe(false); }); });
