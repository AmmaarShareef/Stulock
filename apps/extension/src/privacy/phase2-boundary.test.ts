import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 2 monitor privacy boundary", () => {
  it("does not request host access or inspect raw page identifiers", async () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const [manifest, background] = await Promise.all([
      readFile(path.join(root, "wxt.config.ts"), "utf8"),
      readFile(path.join(root, "entrypoints/background.ts"), "utf8"),
    ]);
    expect(manifest).not.toMatch(/host_permissions|<all_urls>|activeTab|offscreen/);
    expect(background).not.toMatch(/\.url\b|\.title\b|captureVisibleTab|getUserMedia/);
  });
});
