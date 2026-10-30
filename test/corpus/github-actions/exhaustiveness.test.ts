import { describe, expect, it } from "vitest";

import { job, render, step, workflow } from "../../../src/github-actions/index.js";
import {
  filledRawPaths,
  gapPaths,
  inventoryPaths,
  remediesFor,
  unique,
  unusedLedgerPaths,
} from "../gate.js";
import { problemsFor } from "../../schemas/validate.js";
import { readVendored } from "../vendored.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { ENTRIES, type Entry } from "./entries.js";
import { AUTHOR_NAMED, LEDGER_RULES, keyPaths, rawPathsOf } from "./exhaustiveness.js";
import { INVENTORY } from "./inventory.js";

const MODELLED = inventoryPaths({
  fixtures: INVENTORY,
  renderOf: (document) => render(document.workflow, { header: "" }),
  keyPaths,
});

const MODELLED_SET = new Set(MODELLED);
const LEDGER = COVERAGE_DEBT.map((debt) => debt.path);
const DECLARED = unique(LEDGER.map((path) => LEDGER_RULES.translate(path)));

/** The corpus differs from the modelled set by exactly the ledger's raw paths. */
const differenceOf = async (entry: Entry): Promise<readonly string[]> =>
  unique(
    (await keyPaths(await readVendored(import.meta.dirname, entry.file))).filter(
      (path) => !MODELLED_SET.has(path),
    ),
  );

describe("inventory", () => {
  it("renders every document to data the vendored schema accepts", () => {
    const problems = INVENTORY.flatMap((document) =>
      problemsFor("github-actions", render(document.workflow, { header: "" })).map(
        (problem) => `${document.name}: ${problem.path} ${problem.message}`,
      ),
    );

    expect(problems).toStrictEqual([]);
  });

  it("uses no raw anywhere", () => {
    expect(INVENTORY.flatMap((document) => rawPathsOf(document.workflow))).toStrictEqual([]);
  });

  it("contains every declared author-named path, so a typo cannot exclude a subtree", () => {
    expect(AUTHOR_NAMED.filter((path) => !MODELLED_SET.has(path))).toStrictEqual([]);
  });

  it("covers more than one document, so the shapes that cannot coexist are exercised", () => {
    expect(INVENTORY.length).toBeGreaterThan(1);
  });
});

describe("exhaustiveness gate", () => {
  it.each(ENTRIES)("$name needs exactly the ledger's raw paths", async (entry: Entry) => {
    expect(await differenceOf(entry)).toStrictEqual(DECLARED);
  });

  it.each(ENTRIES)("$name uses no raw for a modelled key", (entry: Entry) => {
    expect(filledRawPaths(rawPathsOf(entry.workflow), MODELLED, LEDGER_RULES)).toStrictEqual([]);
  });

  it.each(ENTRIES)("$name declares no ledger row it does not use", async (entry: Entry) => {
    const corpus = await keyPaths(await readVendored(import.meta.dirname, entry.file));

    expect(unusedLedgerPaths(corpus, LEDGER, LEDGER_RULES)).toStrictEqual([]);
  });
});

describe("gate failure cases", () => {
  it("reports a corpus path outside the inventory and the ledger, naming both remedies", () => {
    const invented = "$.jobs.*.steps[].uses-with";
    const report = gapPaths([...MODELLED, invented], MODELLED, LEDGER, LEDGER_RULES);

    expect(report).toStrictEqual([invented]);
    expect(remediesFor(invented)).toContain("model it in the vocabulary");
    expect(remediesFor(invented)).toContain("express it through raw and declare it");
  });

  it("reports raw used for a key the inventory contains", () => {
    const sneaky = workflow({
      name: "Sneaky",
      on: "push",
      jobs: [
        job({
          id: "build",
          "runs-on": "ubuntu-latest",
          raw: { steps: [] },
        }),
      ],
    });

    expect(filledRawPaths(rawPathsOf(sneaky), MODELLED, LEDGER_RULES)).toStrictEqual([
      "$.jobs.*.steps",
    ]);
  });
});

describe("gate report", () => {
  it("reports raw at workflow level on a modelled key", () => {
    const sneaky = workflow({ name: "Sneaky", on: "push", jobs: [], raw: { name: "Other" } });

    expect(filledRawPaths(rawPathsOf(sneaky), MODELLED, LEDGER_RULES)).toStrictEqual(["$.name"]);
  });

  it("reports raw at step level on a modelled key", () => {
    const sneaky = workflow({
      name: "Sneaky",
      on: "push",
      jobs: [job({ id: "build", steps: [step({ raw: { name: "Other" } })] })],
    });

    expect(filledRawPaths(rawPathsOf(sneaky), MODELLED, LEDGER_RULES)).toStrictEqual([
      "$.jobs.*.steps[].name",
    ]);
  });

  it("reports a ledger row no fixture needs", () => {
    expect(unusedLedgerPaths([], ["$.raw.not-used"], LEDGER_RULES)).toStrictEqual(["$.not-used"]);
  });

  it("sorts and de-duplicates the report", () => {
    expect(gapPaths(["$.z", "$.a", "$.z"], [], [], LEDGER_RULES)).toStrictEqual(["$.a", "$.z"]);
  });

  it("translates a ledger path to the modelled position it stands in for", () => {
    expect(LEDGER_RULES.translate("$.raw.on")).toBe("$.on");
    expect(LEDGER_RULES.translate("$.jobs[0].raw.container")).toBe("$.jobs.*.container");
    expect(LEDGER_RULES.translate("$.jobs[2].steps[1].raw.shell")).toBe("$.jobs.*.steps[].shell");
  });

  it("keeps a real step's model intact, so the negative cases are not the only coverage", () => {
    const real = workflow({
      name: "Real",
      on: "push",
      jobs: [job({ id: "build", steps: [step({ run: "true" })] })],
    });

    expect(filledRawPaths(rawPathsOf(real), MODELLED, LEDGER_RULES)).toStrictEqual([]);
  });
});
