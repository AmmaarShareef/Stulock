import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("extension camera grant boundary", () => {
  it("uses hashed, short-lived, consent-rechecked grants rather than a browser login", async () => {
    const migration = await readFile(path.resolve(import.meta.dirname, "../../../supabase/migrations/202610130001_extension_camera_grants.sql"), "utf8");
    expect(migration).toMatch(/code_hash text not null unique/i);
    expect(migration).toMatch(/interval '5 minutes'/i);
    expect(migration).toMatch(/interval '1 hour'/i);
    expect(migration).toMatch(/biometric_consented_at is not null/i);
    expect(migration).toMatch(/revoke all on function public\.redeem_extension_camera_code/i);
    expect(migration).toMatch(/grant execute on function public\.redeem_extension_camera_code\(text\) to anon, authenticated/i);
  });
});
