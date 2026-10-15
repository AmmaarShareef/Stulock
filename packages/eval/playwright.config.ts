import { defineConfig } from "@playwright/test";

// Chromium extension/media flags are added for clip evaluation jobs. Staging smoke
// tests use the same runner and remain skipped until STAGING_BASE_URL is provided.
export default defineConfig({ testDir: "./e2e", timeout: 30_000, retries: 1, use: { headless: true, trace: "retain-on-failure" }, reporter: "list" });
