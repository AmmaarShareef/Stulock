import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 5 extension release manifest", () => {
  it("has a production semver version and no broad host or capture permission", async () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as { version: string };
    const config = await readFile(path.join(root, "wxt.config.ts"), "utf8");
    expect(pkg.version).toBe("1.0.0");
    expect(config).not.toMatch(/<all_urls>|activeTab|captureVisibleTab|"camera"/);
  });
});
