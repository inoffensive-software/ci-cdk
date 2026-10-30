import { parse } from "yaml";

import { type Workflow, render } from "../../../src/github-actions/index.js";
import { keyPath, walkPaths, type YamlNode } from "../paths.js";
import { INVENTORY } from "./inventory.js";

/**
 * Map keys that belong to the author, not to the provider. A child directly under one of these paths
 * is a name the author chose, so the gate normalises it to `*`; two names at the same position are
 * the same grammar. Sequence positions become `[]` for the same reason.
 *
 * The list is written in the gate's notation, not the source's, so `$.jobs.*` is the body of any job
 * and `$.jobs.*.services.*.env` is the env of any service. A test asserts every entry occurs in the
 * inventory, so a typo excludes nothing silently.
 */
export const AUTHOR_NAMED: readonly string[] = [
  "$.jobs",
  "$.env",
  "$.jobs.*.env",
  "$.jobs.*.steps[].env",
  "$.jobs.*.steps[].with",
  "$.jobs.*.with",
  "$.jobs.*.secrets",
  "$.jobs.*.outputs",
  "$.permissions",
  "$.jobs.*.permissions",
  "$.jobs.*.strategy.matrix",
  "$.jobs.*.services",
  "$.jobs.*.container.env",
  "$.jobs.*.services.*.env",
  "$.on",
  "$.on.*.inputs",
];

/**
 * Every key path in a YAML document, with sequence positions and author-chosen names normalised.
 * The input is text, so the parse result crosses the boundary once here and is never seen as
 * untyped data again.
 */
export const keyPaths = (text: string): readonly string[] => {
  const document: YamlNode = parse(text);

  return walkPaths(document, AUTHOR_NAMED);
};

/** The modelled set: the union of the inventory documents' paths, rendered exactly as a consumer's. */
export const inventoryPaths = (): readonly string[] => {
  const paths = new Set<string>();

  for (const document of INVENTORY) {
    for (const path of keyPaths(render(document.workflow, { header: "" }))) {
      paths.add(path);
    }
  }

  return [...paths].toSorted();
};

const STEP_PATH = "$.jobs.*.steps[]";

/**
 * The modelled path each `raw` entry stands in for, at the level the author wrote it. A raw key is
 * always a key the vocabulary lacks, so its stand-in is the same position without the `raw` layer.
 */
export const rawPathsOf = (workflow: Workflow): readonly string[] => {
  const paths: string[] = Object.keys(workflow.raw ?? {}).map((key) => keyPath("$", key));

  for (const job of workflow.jobs) {
    paths.push(...Object.keys(job.raw ?? {}).map((key) => keyPath("$.jobs.*", key)));

    for (const step of job.steps ?? []) {
      paths.push(...Object.keys(step.raw ?? {}).map((key) => keyPath(STEP_PATH, key)));
    }
  }

  return paths.toSorted();
};

const LEDGER_ROW = /^\$\.jobs\[\d+\]\.steps\[\d+\]\.raw\./u;
const LEDGER_JOB = /^\$\.jobs\[\d+\]\.raw\./u;
const LEDGER_WORKFLOW = /^\$\.raw\./u;

/** A ledger path is written where the author put `raw`; the gate compares modelled positions. */
export const translateLedgerPath = (path: string): string => {
  if (LEDGER_ROW.test(path)) {
    return path.replace(LEDGER_ROW, "$.jobs.*.steps[].");
  }

  if (LEDGER_JOB.test(path)) {
    return path.replace(LEDGER_JOB, "$.jobs.*.");
  }

  return path.replace(LEDGER_WORKFLOW, "$.");
};

/** Sorted and de-duplicated, because two jobs reaching for the same missing key are one gap. */
export const unique = (paths: readonly string[]): readonly string[] =>
  [...new Set(paths)].toSorted();

/** Corpus paths the vocabulary cannot emit and the fixture does not declare through `raw`. */
export const gapPaths = (
  corpus: readonly string[],
  modelled: readonly string[],
  declared: readonly string[],
): readonly string[] => {
  const known = new Set([...modelled, ...declared.map((path) => translateLedgerPath(path))]);

  return unique(corpus.filter((path) => !known.has(path)));
};

/** Declared gaps the corpus does not need, which would let a row rot without failing. */
export const unusedLedgerPaths = (
  corpus: readonly string[],
  declared: readonly string[],
): readonly string[] => {
  const used = new Set(corpus);

  return unique(
    declared.flatMap((path) => {
      const modelled = translateLedgerPath(path);

      return used.has(modelled) ? [] : [modelled];
    }),
  );
};

/** `raw` that stands in for a key the inventory already models; the gate treats this as a failure. */
export const filledRawPaths = (
  workflow: Workflow,
  modelled: readonly string[],
): readonly string[] => {
  const known = new Set(modelled);

  return unique(rawPathsOf(workflow).filter((path) => known.has(path)));
};

/** The failure text a reader needs: the path, and both ways to make it legal. */
export const remediesFor = (path: string): string =>
  `${path} is not modelled; model it in the vocabulary, or express it through raw and declare it in the ledger`;
