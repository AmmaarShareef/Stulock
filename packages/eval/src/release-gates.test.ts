import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release gate specification", () => {
  it("requires a measurable false-alarm threshold before an intervention ships", async () => {
    const spec = await readFile(path.resolve(import.meta.dirname, "../../../docs/technical-framework.html"), "utf8");
    expect(spec).toMatch(/False alarms per hour[\s\S]{0,200}&lt;\s*1\.0/i);
    expect(spec).toMatch(/Metrics that gate a release/i);
  });
});
