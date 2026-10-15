import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("leaderboard preference access", () => {
  it("exposes only the signed-in user’s own opt-in preference through an RPC", async () => {
    const migration = await readFile(path.resolve(import.meta.dirname, "../../../supabase/migrations/202610150002_phase4_leaderboard_preference_read.sql"), "utf8");
    expect(migration).toMatch(/where user_id = auth\.uid\(\)/i);
    expect(migration).toMatch(/security definer/i);
    expect(migration).not.toMatch(/create policy/i);
  });
});
