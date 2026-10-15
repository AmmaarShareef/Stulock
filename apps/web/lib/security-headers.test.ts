import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers";

describe("production security headers", () => {
  it("denies framing, MIME sniffing, unnecessary device APIs, and loose referrers", () => {
    const values = new Map(securityHeaders.map((header) => [header.key, header.value]));
    expect(values.get("X-Frame-Options")).toBe("DENY");
    expect(values.get("X-Content-Type-Options")).toBe("nosniff");
    expect(values.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(values.get("Permissions-Policy")).toContain("microphone=()");
  });
});
