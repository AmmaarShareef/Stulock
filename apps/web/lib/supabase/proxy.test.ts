import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Supabase session refresh proxy", () => {
  it("refreshes verified claims and preserves returned session cookies", async () => {
    const source = await readFile(path.resolve(import.meta.dirname, "../../proxy.ts"), "utf8");
    const helper = await readFile(path.resolve(import.meta.dirname, "proxy.ts"), "utf8");
    expect(source).toMatch(/export async function proxy/);
    expect(helper).toMatch(/auth\.getClaims\(\)/);
    expect(helper).toMatch(/response\.cookies\.set/);
    expect(helper).toMatch(/private, no-store/);
  });
});
