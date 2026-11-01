import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { renderProviderTable } from "./provider-index.js";
import { blockIn } from "./report.js";

const README = resolve(import.meta.dirname, "../..", "README.md");
const REGENERATE = process.env["UPDATE_README_COVERAGE"] === "1";

/** Replaces a marked block, keeping its markers and the blank lines around the content. */
const replaceBlock = (text: string, name: string, content: string): string => {
  const pattern = new RegExp(`(<!-- ${name}:start -->)\\n[\\s\\S]*?\\n(<!-- ${name}:end -->)`, "u");

  if (!pattern.test(text)) {
    throw new Error(`no ${name} block in the document`);
  }

  return text.replace(
    pattern,
    (_match, start: string, end: string) => `${start}\n\n${content}\n\n${end}`,
  );
};

describe("provider index", () => {
  it.skipIf(REGENERATE)("shows the generated coverage table exactly", async () => {
    const readme = await readFile(README, "utf8");

    expect(blockIn(readme, "providers")).toBe(renderProviderTable());
  });

  it.runIf(REGENERATE)("regenerates the coverage table in the README", async () => {
    const readme = await readFile(README, "utf8");
    const generated = renderProviderTable();

    await writeFile(README, replaceBlock(readme, "providers", generated));

    expect(blockIn(await readFile(README, "utf8"), "providers")).toBe(generated);
  });
});
