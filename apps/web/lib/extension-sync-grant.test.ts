import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("extension sync grant boundary", () => {
  it("uses an expiring hashed link grant and writes session ownership server-side", async () => {
    const migration = await readFile(path.resolve(import.meta.dirname, "../../../supabase/migrations/202610150001_phase4_sync_and_leaderboard.sql"), "utf8");
    expect(migration).toMatch(/code_hash text not null unique/i);
    expect(migration).toMatch(/interval '5 minutes'/i);
    expect(migration).toMatch(/insert into public\.sessions \(id, user_id/i);
    expect(migration).toMatch(/p_user_id uuid/i);
    expect(migration).not.toMatch(/\b(?:url|title|browsing)_/i);
  });
});
