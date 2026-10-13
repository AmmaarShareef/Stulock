import { describe, expect, it } from "vitest";
import { isAllowlistedDomain, normalizeAllowedDomains } from "./allowlist";

describe("local allowlist rules", () => {
  it("normalizes only valid user-entered domains", () => {
    expect(normalizeAllowedDomains("https://KhanAcademy.org, www.wikipedia.org/path, not a domain")).toEqual(["khanacademy.org", "wikipedia.org"]);
  });

  it("matches a listed domain and its subdomains without recording a URL", () => {
    expect(isAllowlistedDomain("learn.khanacademy.org", ["khanacademy.org"])).toBe(true);
    expect(isAllowlistedDomain("unrelated.org", ["khanacademy.org"])).toBe(false);
  });
});
