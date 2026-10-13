import { describe, expect, it } from "vitest";
import { canUseCameraGrant, normalizedWebOrigin } from "./eligibility";

const grant = { grantId: "7f4f18ad-627d-42b8-8093-10d4ef5c8e04", renewalSecret: "a".repeat(32), expiresAt: "2026-10-13T13:00:00.000Z" };

describe("camera eligibility", () => {
  it("refuses expired or malformed grants before media can be requested", () => {
    expect(canUseCameraGrant(grant, new Date("2026-10-13T12:59:59.000Z"))).toBe(true);
    expect(canUseCameraGrant(grant, new Date("2026-10-13T13:00:00.000Z"))).toBe(false);
    expect(canUseCameraGrant({ ...grant, renewalSecret: "short" }, new Date("2026-10-13T12:00:00.000Z"))).toBe(false);
  });

  it("allows only a local development or HTTPS StuLock origin", () => {
    expect(normalizedWebOrigin("http://localhost:3000/path")).toBe("http://localhost:3000");
    expect(normalizedWebOrigin("https://app.stulock.example")).toBe("https://app.stulock.example");
    expect(normalizedWebOrigin("http://not-secure.example")).toBeNull();
  });
});
