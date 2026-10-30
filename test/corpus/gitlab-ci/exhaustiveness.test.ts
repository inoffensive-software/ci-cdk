import { describe, expect, it } from "vitest";

import { job, pipeline, render } from "@inoffensive/ci-cdk/gitlab-ci";
import {
  filledRawPaths,
  gapPaths,
  inventoryPaths,
  remediesFor,
  unusedLedgerPaths,
} from "../gate.js";
import { readVendored } from "../vendored.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { type CorpusEntry, GITLAB_ENTRIES } from "./entries.js";
import { AUTHOR_NAMED, LEDGER_RULES, keyPaths, rawPathsOf } from "./exhaustiveness.js";
import { EXPECTED_MODELLED } from "./expected-modelled.js";
import { INVENTORY } from "./inventory.js";

const MODELLED = inventoryPaths({
  fixtures: INVENTORY,
  renderOf: (document) => render(document.pipeline, { header: "" }),
  keyPaths,
});

const LEDGER = COVERAGE_DEBT.map((row) => row.path);
const HIDDEN_MODELLED = MODELLED.filter((path) => path.startsWith('$[".'));

const AUTHORED_TEMPLATES = INVENTORY.flatMap((document) =>
  Object.keys(document.pipeline.templates ?? {}),
);

const corpusPathsOf = async (entry: CorpusEntry): Promise<readonly string[]> =>
  keyPaths(await readVendored(import.meta.dirname, entry.file));

describe("inventory", () => {
  it("models exactly the keys the vocabulary currently emits", () => {
    expect(MODELLED).toStrictEqual(EXPECTED_MODELLED);
  });

  it("uses no raw anywhere", () => {
    expect(INVENTORY.flatMap((document) => rawPathsOf(document.pipeline))).toStrictEqual([]);
  });

  it("names only author-named maps the inventory actually emits", () => {
    expect(AUTHOR_NAMED.filter((path) => !MODELLED.includes(`${path}.*`))).toStrictEqual([]);
  });

  it("authors a hidden template, which is data rather than modelled vocabulary", () => {
    expect(AUTHORED_TEMPLATES.length).toBeGreaterThan(0);
    expect(HIDDEN_MODELLED).toStrictEqual([]);
  });
});

describe("exhaustiveness gate", () => {
  it.each(GITLAB_ENTRIES)("$name declares every raw path the ledger allows", async (entry) => {
    expect(gapPaths(await corpusPathsOf(entry), MODELLED, LEDGER, LEDGER_RULES)).toStrictEqual([]);
  });

  it.each(GITLAB_ENTRIES)("$name uses no raw for a modelled key", (entry) => {
    expect(filledRawPaths(rawPathsOf(entry.pipeline), MODELLED, LEDGER_RULES)).toStrictEqual([]);
  });

  it("declares no ledger row that no entry needs", async () => {
    const entries = await Promise.all(GITLAB_ENTRIES.map((entry) => corpusPathsOf(entry)));

    expect(unusedLedgerPaths(entries.flat(), LEDGER, LEDGER_RULES)).toStrictEqual([]);
  });

  it("leaves six rows, all vocabulary gaps, after rules and needs landed", () => {
    expect(COVERAGE_DEBT).toHaveLength(6);
  });
});

describe("corpus paths", () => {
  it("normalises a job name to a single shape, so two entries compare", () => {
    const text = render(
      pipeline({ jobs: [job({ name: "build job", stage: "build", script: "true" })] }),
      { header: "" },
    );

    expect(keyPaths(text)).toStrictEqual(["$.*", "$.*.script", "$.*.stage"]);
  });

  it("treats a top-level dot-prefixed key as author data and drops its subtree", () => {
    const text = render(
      pipeline({
        templates: { ".setup": { script: ["npm ci"], variables: { A: "b" } } },
        jobs: [job({ name: "build", script: "true" })],
      }),
      { header: "" },
    );

    expect(keyPaths(text)).toStrictEqual(["$.*", "$.*.script"]);
  });
});

describe("gate failure cases", () => {
  it("reports a corpus path outside the inventory and the ledger, naming both remedies", () => {
    const invented = "$.*.environment";
    const report = gapPaths([...MODELLED, invented], MODELLED, LEDGER, LEDGER_RULES);

    expect(report).toStrictEqual([invented]);
    expect(remediesFor(invented)).toContain("model it in the vocabulary");
    expect(remediesFor(invented)).toContain("express it through raw and declare it");
  });

  it("reports raw used for a key the inventory contains", () => {
    const sneaky = pipeline({
      stages: ["build"],
      jobs: [],
      raw: { stages: ["test"] },
    });

    expect(filledRawPaths(rawPathsOf(sneaky), MODELLED, LEDGER_RULES)).toStrictEqual(["$.stages"]);
  });

  it("reports raw used for a job key the inventory contains", () => {
    const sneaky = pipeline({
      jobs: [job({ name: "build", script: "true", raw: { stage: "build" } })],
    });

    expect(filledRawPaths(rawPathsOf(sneaky), MODELLED, LEDGER_RULES)).toStrictEqual(["$.*.stage"]);
  });

  it("ignores a hidden key written through raw, which is author data on both sides", () => {
    const hidden = pipeline({
      jobs: [],
      raw: { ".template": { script: ["npm ci"] } },
    });

    expect(filledRawPaths(rawPathsOf(hidden), MODELLED, LEDGER_RULES)).toStrictEqual([]);
  });

  it("reports a ledger row no fixture needs", () => {
    expect(unusedLedgerPaths([], ["$.raw.not-used"], LEDGER_RULES)).toStrictEqual(["$.not-used"]);
  });

  it("sorts and de-duplicates the report", () => {
    expect(gapPaths(["$.*.z", "$.a", "$.*.z"], [], [], LEDGER_RULES)).toStrictEqual([
      "$.*.z",
      "$.a",
    ]);
  });
});

describe("gate report", () => {
  it("translates a ledger path to the modelled position it stands in for", () => {
    expect(LEDGER_RULES.translate("$.raw.workflow")).toBe("$.workflow");
    expect(LEDGER_RULES.translate("$.jobs[0].raw.image")).toBe("$.*.image");
    expect(LEDGER_RULES.translate("$.jobs[2].raw.variables")).toBe("$.*.variables");
    expect(LEDGER_RULES.translate('$.raw[".terraform-versions"]')).toBe('$[".terraform-versions"]');
  });

  it("lets one declared row explain the whole subtree the raw entry owns", () => {
    expect(
      gapPaths(["$.variables.BASE_IMAGE"], [], ["$.raw.variables"], LEDGER_RULES),
    ).toStrictEqual([]);
    expect(
      unusedLedgerPaths(["$.variables.BASE_IMAGE"], ["$.raw.variables"], LEDGER_RULES),
    ).toStrictEqual([]);
  });

  it("does not let a row explain a sibling whose name merely starts the same", () => {
    expect(gapPaths(["$.variables_extra"], [], ["$.raw.variables"], LEDGER_RULES)).toStrictEqual([
      "$.variables_extra",
    ]);
  });

  it("ignores a hidden ledger row on both sides, so author data never needs a row", () => {
    expect(gapPaths([], [], ['$.raw[".template"]'], LEDGER_RULES)).toStrictEqual([]);
    expect(unusedLedgerPaths([], ['$.raw[".template"]'], LEDGER_RULES)).toStrictEqual([]);
    expect(gapPaths(['$[".template"].script'], [], [], LEDGER_RULES)).toStrictEqual([]);
  });

  it("keeps a modelled job's paths intact, so the negative cases are not the only coverage", () => {
    const real = pipeline({
      stages: ["build"],
      jobs: [job({ name: "build", stage: "build", script: "npm ci" })],
    });

    expect(filledRawPaths(rawPathsOf(real), MODELLED, LEDGER_RULES)).toStrictEqual([]);
    expect(rawPathsOf(real)).toStrictEqual([]);
  });
});
