import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 3 privacy boundary", () => {
  it("keeps camera processing local and host access narrowly scoped", async () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const [manifest, background, runtime] = await Promise.all([
      readFile(path.join(root, "wxt.config.ts"), "utf8"),
      readFile(path.join(root, "entrypoints/background.ts"), "utf8"),
      readFile(path.join(root, "src/vision/runtime.ts"), "utf8"),
    ]);
    expect(manifest).toMatch(/offscreen/);
    expect(manifest).toMatch(/localhost:3000/);
    expect(manifest).not.toMatch(/<all_urls>|activeTab|camera/);
    expect(background).not.toMatch(/\.url\b|\.title\b|captureVisibleTab|getUserMedia/);
    expect(runtime).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/);
  });
});
