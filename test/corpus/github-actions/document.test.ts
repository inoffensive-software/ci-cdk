import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { COVERAGE_DEBT } from "./coverage-debt.js";
import { renderCoverageTable, renderOpenGaps, type CorpusPaths } from "./coverage-table.js";
import { ENTRIES } from "./entries.js";
import { inventoryPaths, keyPaths } from "./exhaustiveness.js";
import { readVendored } from "../vendored.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const DOCUMENT = resolve(REPO_ROOT, "docs/providers/github-actions.md");
const PROVENANCE = resolve(import.meta.dirname, "PROVENANCE.md");
const LEDGER = COVERAGE_DEBT.map((debt) => debt.path);

const corpusPaths = (): Promise<readonly CorpusPaths[]> =>
  Promise.all(
    ENTRIES.map(async (entry) => ({
      name: entry.name,
      paths: await keyPaths(await readVendored(import.meta.dirname, entry.file)),
    })),
  );

/** The text between a pair of marker comments, without the markers themselves. */
const blockIn = (text: string, name: string): string => {
  const match = new RegExp(
    `<!-- ${name}:start -->\\n([\\s\\S]*?)\\n<!-- ${name}:end -->`,
    "u",
  ).exec(text);

  if (match === null || match[1] === undefined) {
    throw new Error(`no ${name} block in the document`);
  }

  return match[1].trim();
};

describe("provider document", () => {
  it("shows the generated coverage table exactly", async () => {
    const document = await readFile(DOCUMENT, "utf8");
    const generated = renderCoverageTable(inventoryPaths(), await corpusPaths(), LEDGER);

    expect(blockIn(document, "coverage")).toBe(generated);
  });

  it("shows the ledger-generated open gaps exactly", async () => {
    const document = await readFile(DOCUMENT, "utf8");

    expect(blockIn(document, "open-gaps")).toBe(renderOpenGaps(COVERAGE_DEBT));
  });

  it("names every corpus entry", async () => {
    const document = await readFile(DOCUMENT, "utf8");

    for (const entry of ENTRIES) {
      expect(document).toContain(entry.name);
    }
  });

  it("cites every repository and commit in the provenance record", async () => {
    const document = await readFile(DOCUMENT, "utf8");
    const provenance = await readFile(PROVENANCE, "utf8");

    const repos = [...provenance.matchAll(/https:\/\/github\.com\/[^\s<>]+/gu)].map(
      (match) => match[0],
    );

    const commits = [...provenance.matchAll(/\b[0-9a-f]{40}\b/gu)].map((match) => match[0]);

    for (const value of [...repos, ...commits]) {
      expect(document).toContain(value);
    }
  });
});
