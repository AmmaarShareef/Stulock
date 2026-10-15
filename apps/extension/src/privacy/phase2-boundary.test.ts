import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Phase 4 privacy boundary", () => {
  it("keeps camera processing local, host access narrowly scoped, and page addresses ephemeral", async () => {
    const root = path.resolve(import.meta.dirname, "../..");
    const [manifest, background, runtime] = await Promise.all([
      readFile(path.join(root, "wxt.config.ts"), "utf8"),
      readFile(path.join(root, "entrypoints/background.ts"), "utf8"),
      readFile(path.join(root, "src/vision/runtime.ts"), "utf8"),
    ]);
    expect(manifest).toMatch(/offscreen/);
    expect(manifest).toMatch(/localhost:3000/);
    expect(manifest).not.toMatch(/<all_urls>|activeTab|camera/);
    expect(background).toMatch(/describePageAddress\(address/);
    expect(background).not.toMatch(/storage\.local\.(?:set|get).*address|policyEvents\.put\([^)]*address|captureVisibleTab|getUserMedia/);
    expect(runtime).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/);
  });
});
