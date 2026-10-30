import { describe, expect, it } from "vitest";

import { pipelineConfig, render, step } from "../../../src/bitbucket-pipelines/index.js";
import {
  filledRawPaths,
  gapPaths,
  inventoryPaths,
  remediesFor,
  unique,
  unusedLedgerPaths,
} from "../gate.js";
import { readVendored } from "../vendored.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { type CorpusEntry, ENTRIES } from "./entries.js";
import { AUTHOR_NAMED, LEDGER_RULES, keyPaths } from "./exhaustiveness.js";
import { INVENTORY } from "./inventory.js";
import { rawPathsOf } from "./raw-paths.js";

const MODELLED = inventoryPaths({
  fixtures: INVENTORY,
  renderOf: (document) => render(document.config, { header: "" }),
  keyPaths,
});

const MODELLED_SET = new Set(MODELLED);
const LEDGER = COVERAGE_DEBT.map((debt) => debt.path);

const corpusPaths = async (entry: CorpusEntry): Promise<readonly string[]> =>
  keyPaths(await readVendored(import.meta.dirname, entry.file));

describe("inventory", () => {
  it("uses no raw anywhere", () => {
    expect(INVENTORY.flatMap((document) => rawPathsOf(document.config))).toStrictEqual([]);
  });

  it("contains every declared author-named path, so a typo cannot exclude a subtree", () => {
    expect(AUTHOR_NAMED.filter((path) => !MODELLED_SET.has(path))).toStrictEqual([]);
  });

  it("covers more than one document, so the shapes that cannot coexist are exercised", () => {
    expect(INVENTORY.length).toBeGreaterThan(1);
  });
});

describe("exhaustiveness gate", () => {
  it.each(ENTRIES)("$name exposes no key outside the inventory and the ledger", async (entry) => {
    expect(gapPaths(await corpusPaths(entry), MODELLED, LEDGER, LEDGER_RULES)).toStrictEqual([]);
  });

  it.each(ENTRIES)("$name uses no raw for a modelled key", (entry) => {
    expect(filledRawPaths(rawPathsOf(entry.config), MODELLED, LEDGER_RULES)).toStrictEqual([]);
  });

  it("declares no ledger row the corpus does not use", async () => {
    const corpus = unique((await Promise.all(ENTRIES.map((entry) => corpusPaths(entry)))).flat());

    expect(unusedLedgerPaths(corpus, LEDGER, LEDGER_RULES)).toStrictEqual([]);
  });

  it("holds an empty ledger: every corpus key has a modelled field", () => {
    expect(COVERAGE_DEBT).toStrictEqual([]);
  });
});

describe("gate failure cases", () => {
  it("reports a corpus key outside the inventory and the ledger, naming both remedies", () => {
    const config = pipelineConfig({
      pipelines: { default: [step({ script: ["true"] })] },
      raw: { "not-a-bitbucket-key": "value" },
    });

    const corpus = keyPaths(render(config, { header: "" }));
    const invented = '$["not-a-bitbucket-key"]';

    expect(gapPaths(corpus, MODELLED, [], LEDGER_RULES)).toStrictEqual([invented]);
    expect(remediesFor(invented)).toContain("model it in the vocabulary");
    expect(remediesFor(invented)).toContain("express it through raw and declare it");
  });

  it("reports a declared ledger row no fixture needs", () => {
    const config = pipelineConfig({ pipelines: { default: [step({ script: ["true"] })] } });
    const corpus = keyPaths(render(config, { header: "" }));

    expect(unusedLedgerPaths(corpus, ["$.raw.not-used"], LEDGER_RULES)).toStrictEqual([
      "$.not-used",
    ]);
  });

  it("reports raw used for a modelled key at document level", () => {
    const sneaky = pipelineConfig({
      pipelines: { default: [step({ script: ["true"] })] },
      raw: { image: "node:24" },
    });

    expect(filledRawPaths(rawPathsOf(sneaky), MODELLED, LEDGER_RULES)).toStrictEqual(["$.image"]);
  });
});

describe("gate report", () => {
  it("reports raw used for a modelled key inside a step", () => {
    const sneaky = pipelineConfig({
      pipelines: {
        default: [step({ script: ["true"], raw: { name: "Other" } })],
      },
    });

    expect(filledRawPaths(rawPathsOf(sneaky), MODELLED, LEDGER_RULES)).toStrictEqual([
      "$.pipelines.default[].step.name",
    ]);
  });

  it("sorts and de-duplicates the report", () => {
    expect(gapPaths(["$.z", "$.a", "$.z"], [], [], LEDGER_RULES)).toStrictEqual(["$.a", "$.z"]);
  });

  it("translates a ledger path to the modelled position it stands in for", () => {
    expect(LEDGER_RULES.translate("$.raw.image")).toBe("$.image");
    expect(LEDGER_RULES.translate("$.pipelines.default[0].step.raw.name")).toBe(
      "$.pipelines.default[].step.name",
    );
    expect(LEDGER_RULES.translate("$.pipelines.branches[1].pipeline[0].step.raw.artifacts")).toBe(
      "$.pipelines.branches.*[].step.artifacts",
    );
    expect(
      LEDGER_RULES.translate('$.pipelines["pull-requests"][0].pipeline[2].stage.raw.size'),
    ).toBe('$.pipelines["pull-requests"].*[].stage.size');
  });

  it("keeps a real step's model intact, so the negative cases are not the only coverage", () => {
    const real = pipelineConfig({ pipelines: { default: [step({ script: ["true"] })] } });

    expect(filledRawPaths(rawPathsOf(real), MODELLED, LEDGER_RULES)).toStrictEqual([]);
  });
});
