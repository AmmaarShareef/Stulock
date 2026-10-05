import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const packageRoots = [
  path.resolve(import.meta.dirname, ".."),
  path.resolve(import.meta.dirname, "../../../vision/src"),
];
const forbiddenImports = /(?:from\s*["'](?:react|react-dom|chrome)["']|import\s*["'](?:react|react-dom|chrome)["']|\bchrome\s*\.)/;

async function sourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => entry.isDirectory()
    ? sourceFiles(path.join(directory, entry.name))
    : entry.name.endsWith(".ts") ? [path.join(directory, entry.name)] : []));
  return files.flat();
}

describe("portable package boundary", () => {
  it("keeps core and vision independent of React and Chrome APIs", async () => {
    const files = (await Promise.all(packageRoots.map(sourceFiles))).flat();
    const violations = (await Promise.all(files.map(async (file) => ({ file, content: await readFile(file, "utf8") }))))
      .filter(({ content }) => forbiddenImports.test(content))
      .map(({ file }) => path.relative(path.resolve(import.meta.dirname, "../../../.."), file));
    expect(violations).toEqual([]);
  });
});
