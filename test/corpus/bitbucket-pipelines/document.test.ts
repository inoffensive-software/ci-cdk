import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { COVERAGE_DEBT } from "./coverage-debt.js";
import {
  collapsePosition,
  displayKeysOf,
  renderCoverageTable,
  renderOpenGaps,
  type CorpusPaths,
} from "./coverage-table.js";
import { renderDocumentedGrammar } from "./documented-grammar.js";
import { ENTRIES } from "./entries.js";
import { keyPaths } from "./exhaustiveness.js";
import { GAP_CATEGORIES, GAPS, MODELLED_PATHS, OVERCLAIMS, SCHEMA_PATHS } from "./schema-gap.js";
import { readVendored } from "../vendored.js";

const REPO_ROOT = resolve(import.meta.dirname, "../../..");
const DOCUMENT = resolve(REPO_ROOT, "docs/providers/bitbucket-pipelines.md");
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

/** The counts the block's lead states, read back so they can be held to the lists. */
const countsIn = (block: string): readonly number[] => {
  const lead = block.split("\n")[0] ?? "";

  return [...lead.matchAll(/\d+/gu)].map((match) => Number(match[0]));
};

const expectedCounts = (): readonly number[] => [
  SCHEMA_PATHS.length,
  GAPS.length,
  ...GAP_CATEGORIES.map((category) => GAPS.filter((gap) => gap.category === category).length),
  OVERCLAIMS.length,
];

describe("provider document", () => {
  it("shows the generated coverage table exactly", async () => {
    const document = await readFile(DOCUMENT, "utf8");
    const generated = renderCoverageTable(MODELLED_PATHS, await corpusPaths(), LEDGER);

    expect(blockIn(document, "coverage")).toBe(generated);
  });

  it("states the modelled-path and display-key counts", async () => {
    const document = await readFile(DOCUMENT, "utf8");

    expect(countsIn(blockIn(document, "coverage"))).toStrictEqual([
      MODELLED_PATHS.length,
      displayKeysOf(MODELLED_PATHS).length,
    ]);
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

    const repos = [...provenance.matchAll(/https:\/\/[^\s<>]+/gu)].map((match) => match[0]);
    const commits = [...provenance.matchAll(/\b[0-9a-f]{40}\b/gu)].map((match) => match[0]);

    for (const value of [...repos, ...commits]) {
      expect(document).toContain(value);
    }
  });
});

describe("documented grammar section", () => {
  it("shows the generated block exactly", async () => {
    const document = await readFile(DOCUMENT, "utf8");
    const generated = renderDocumentedGrammar(SCHEMA_PATHS, GAPS, OVERCLAIMS);

    expect(blockIn(document, "documented-grammar")).toBe(generated);
  });

  it("states the counts the lists hold", async () => {
    const document = await readFile(DOCUMENT, "utf8");

    expect(countsIn(blockIn(document, "documented-grammar"))).toStrictEqual(expectedCounts());
  });

  it("shows every declared gap and overclaim", async () => {
    const document = await readFile(DOCUMENT, "utf8");
    const block = blockIn(document, "documented-grammar");

    const individual = GAPS.filter((gap) => gap.category !== "out-of-scope");

    for (const gap of individual) {
      expect(block).toContain(`\`${gap.path}\``);
    }

    const grouped = GAPS.filter((gap) => gap.category === "out-of-scope");

    for (const gap of grouped) {
      expect(block).toContain(`\`${collapsePosition(gap.path)}\``);
    }

    for (const overclaim of OVERCLAIMS) {
      expect(block).toContain(`\`${overclaim.path}\``);
    }
  });
});
