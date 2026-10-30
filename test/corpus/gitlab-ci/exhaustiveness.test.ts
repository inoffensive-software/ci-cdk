import { describe, expect, it } from "vitest";

import { job, pipeline, render } from "@inoffensive/ci-cdk/gitlab-ci";
import { readVendored } from "../vendored.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { type CorpusEntry, GITLAB_ENTRIES } from "./entries.js";
import {
  AUTHOR_NAMED,
  filledRawPaths,
  gapPaths,
  inventoryPaths,
  keyPaths,
  rawPathsOf,
  remediesFor,
  translateLedgerPath,
  unusedLedgerPaths,
} from "./exhaustiveness.js";
import { INVENTORY } from "./inventory.js";

const MODELLED = inventoryPaths();
const LEDGER = COVERAGE_DEBT.map((row) => row.path);
const HIDDEN_MODELLED = MODELLED.filter((path) => path.startsWith('$[".'));

const AUTHORED_TEMPLATES = INVENTORY.flatMap((document) =>
  Object.keys(document.pipeline.templates ?? {}),
);

const EXPECTED_MODELLED: readonly string[] = [
  "$.*",
  "$.*.script",
  "$.*.script[]",
  "$.*.stage",
  "$.*.variables",
  "$.*.variables.*",
  "$.default",
  "$.default.after_script",
  "$.default.after_script[]",
  "$.default.artifacts",
  "$.default.artifacts.exclude",
  "$.default.artifacts.exclude[]",
  "$.default.artifacts.expire_in",
  "$.default.artifacts.expose_as",
  "$.default.artifacts.name",
  "$.default.artifacts.paths",
  "$.default.artifacts.paths[]",
  "$.default.artifacts.public",
  "$.default.artifacts.reports",
  "$.default.artifacts.reports.junit",
  "$.default.artifacts.reports.junit[]",
  "$.default.artifacts.when",
  "$.default.before_script",
  "$.default.before_script[]",
  "$.default.cache",
  "$.default.cache.key",
  "$.default.cache.key.files",
  "$.default.cache.key.files[]",
  "$.default.cache.paths",
  "$.default.cache.paths[]",
  "$.default.cache[]",
  "$.default.cache[].fallback_keys",
  "$.default.cache[].fallback_keys[]",
  "$.default.cache[].key",
  "$.default.cache[].key.files",
  "$.default.cache[].key.files[]",
  "$.default.cache[].key.prefix",
  "$.default.cache[].paths",
  "$.default.cache[].paths[]",
  "$.default.cache[].policy",
  "$.default.cache[].untracked",
  "$.default.cache[].when",
  "$.default.image",
  "$.default.image.entrypoint",
  "$.default.image.entrypoint[]",
  "$.default.image.name",
  "$.default.image.pull_policy",
  "$.default.interruptible",
  "$.default.retry",
  "$.default.retry.exit_codes",
  "$.default.retry.exit_codes[]",
  "$.default.retry.max",
  "$.default.retry.when",
  "$.default.retry.when[]",
  "$.default.services",
  "$.default.services[]",
  "$.default.services[].alias",
  "$.default.services[].command",
  "$.default.services[].command[]",
  "$.default.services[].entrypoint",
  "$.default.services[].entrypoint[]",
  "$.default.services[].name",
  "$.default.services[].variables",
  "$.default.services[].variables.*",
  "$.default.tags",
  "$.default.tags[]",
  "$.default.timeout",
  "$.include",
  "$.include.local",
  "$.include[]",
  "$.include[].component",
  "$.include[].file",
  "$.include[].file[]",
  "$.include[].inputs",
  "$.include[].inputs.*",
  "$.include[].integrity",
  "$.include[].local",
  "$.include[].project",
  "$.include[].ref",
  "$.include[].remote",
  "$.include[].rules",
  "$.include[].rules[]",
  "$.include[].rules[].changes",
  "$.include[].rules[].changes.compare_to",
  "$.include[].rules[].changes.paths",
  "$.include[].rules[].changes.paths[]",
  "$.include[].rules[].exists",
  "$.include[].rules[].exists[]",
  "$.include[].rules[].if",
  "$.include[].rules[].when",
  "$.include[].template",
  "$.stages",
  "$.stages[]",
  "$.variables",
  "$.variables.*",
  "$.workflow",
  "$.workflow.auto_cancel",
  "$.workflow.auto_cancel.on_job_failure",
  "$.workflow.auto_cancel.on_new_commit",
  "$.workflow.name",
  "$.workflow.rules",
  "$.workflow.rules[]",
  "$.workflow.rules[].exists",
  "$.workflow.rules[].exists[]",
  "$.workflow.rules[].if",
  "$.workflow.rules[].variables",
  "$.workflow.rules[].variables.*",
  "$.workflow.rules[].when",
];

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
    expect(gapPaths(await corpusPathsOf(entry), MODELLED, LEDGER)).toStrictEqual([]);
  });

  it.each(GITLAB_ENTRIES)("$name uses no raw for a modelled key", (entry) => {
    expect(filledRawPaths(entry.pipeline, MODELLED)).toStrictEqual([]);
  });

  it("declares no ledger row that no entry needs", async () => {
    const entries = await Promise.all(GITLAB_ENTRIES.map((entry) => corpusPathsOf(entry)));

    expect(unusedLedgerPaths(entries.flat(), LEDGER)).toStrictEqual([]);
  });

  it("leaves sixty-eight rows, all vocabulary gaps, after the global vocabulary and job variables landed", () => {
    expect(COVERAGE_DEBT).toHaveLength(68);
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
    const report = gapPaths([...MODELLED, invented], MODELLED, LEDGER);

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

    expect(filledRawPaths(sneaky, MODELLED)).toStrictEqual(["$.stages"]);
  });

  it("reports raw used for a job key the inventory contains", () => {
    const sneaky = pipeline({
      jobs: [job({ name: "build", script: "true", raw: { stage: "build" } })],
    });

    expect(filledRawPaths(sneaky, MODELLED)).toStrictEqual(["$.*.stage"]);
  });

  it("ignores a hidden key written through raw, which is author data on both sides", () => {
    const hidden = pipeline({
      jobs: [],
      raw: { ".template": { script: ["npm ci"] } },
    });

    expect(filledRawPaths(hidden, MODELLED)).toStrictEqual([]);
  });

  it("reports a ledger row no fixture needs", () => {
    expect(unusedLedgerPaths([], ["$.raw.not-used"])).toStrictEqual(["$.not-used"]);
  });

  it("sorts and de-duplicates the report", () => {
    expect(gapPaths(["$.*.z", "$.a", "$.*.z"], [], [])).toStrictEqual(["$.*.z", "$.a"]);
  });
});

describe("gate report", () => {
  it("translates a ledger path to the modelled position it stands in for", () => {
    expect(translateLedgerPath("$.raw.workflow")).toBe("$.workflow");
    expect(translateLedgerPath("$.jobs[0].raw.image")).toBe("$.*.image");
    expect(translateLedgerPath("$.jobs[2].raw.variables")).toBe("$.*.variables");
    expect(translateLedgerPath('$.raw[".terraform-versions"]')).toBe('$[".terraform-versions"]');
  });

  it("lets one declared row explain the whole subtree the raw entry owns", () => {
    expect(gapPaths(["$.variables.BASE_IMAGE"], [], ["$.raw.variables"])).toStrictEqual([]);
    expect(unusedLedgerPaths(["$.variables.BASE_IMAGE"], ["$.raw.variables"])).toStrictEqual([]);
  });

  it("does not let a row explain a sibling whose name merely starts the same", () => {
    expect(gapPaths(["$.variables_extra"], [], ["$.raw.variables"])).toStrictEqual([
      "$.variables_extra",
    ]);
  });

  it("ignores a hidden ledger row on both sides, so author data never needs a row", () => {
    expect(gapPaths([], [], ['$.raw[".template"]'])).toStrictEqual([]);
    expect(unusedLedgerPaths([], ['$.raw[".template"]'])).toStrictEqual([]);
    expect(gapPaths(['$[".template"].script'], [], [])).toStrictEqual([]);
  });

  it("keeps a modelled job's paths intact, so the negative cases are not the only coverage", () => {
    const real = pipeline({
      stages: ["build"],
      jobs: [job({ name: "build", stage: "build", script: "npm ci" })],
    });

    expect(filledRawPaths(real, MODELLED)).toStrictEqual([]);
    expect(rawPathsOf(real)).toStrictEqual([]);
  });
});
