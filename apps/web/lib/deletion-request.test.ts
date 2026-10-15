import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("account deletion request boundary", () => {
  it("creates a single private request through an authenticated security-definer RPC", async () => {
    const migration = await readFile(path.resolve(import.meta.dirname, "../../../supabase/migrations/202610150003_phase5_deletion_requests.sql"), "utf8");
    expect(migration).toMatch(/unique.*user_id|user_id.*unique/i);
    expect(migration).toMatch(/auth\.uid\(\)/i);
    expect(migration).toMatch(/security definer/i);
    expect(migration).toMatch(/enable row level security/i);
  });
});
