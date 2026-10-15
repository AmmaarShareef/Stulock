import { describe, expect, it } from "vitest";
import { hasTrustedMutationOrigin } from "./request-security";

describe("sensitive mutation origin guard", () => {
  it("accepts same-origin requests and rejects cross-site or missing origins", () => {
    expect(hasTrustedMutationOrigin(new Request("https://app.stulock.test/api", { method: "POST", headers: { origin: "https://app.stulock.test" } }))).toBe(true);
    expect(hasTrustedMutationOrigin(new Request("https://app.stulock.test/api", { method: "POST", headers: { origin: "https://evil.test" } }))).toBe(false);
    expect(hasTrustedMutationOrigin(new Request("https://app.stulock.test/api", { method: "POST" }))).toBe(false);
  });
});
