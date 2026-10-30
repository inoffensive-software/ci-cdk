import { parse } from "yaml";

import { type PipelineConfig, render } from "../../../src/bitbucket-pipelines/index.js";
import { walkPaths, type YamlNode } from "../paths.js";
import { INVENTORY } from "./inventory.js";
import { rawPathsOf } from "./raw-paths.js";

/**
 * Map keys that belong to the author, not to the provider. A child directly under one of these paths
 * is a name the author chose, so the gate normalises it to `*`; two names at the same position are
 * the same grammar. Sequence positions become `[]` for the same reason.
 *
 * The list is written in the gate's notation, not the source's, so `$.pipelines.branches.*[]` is the
 * body of any selector entry. A test asserts every entry occurs in the inventory, so a typo excludes
 * nothing silently.
 */
export const AUTHOR_NAMED: readonly string[] = [
  "$.definitions.caches",
  "$.definitions.services",
  "$.definitions.services.*.variables",
  "$.pipelines.branches",
  "$.pipelines.tags",
  '$.pipelines["pull-requests"]',
  "$.pipelines.custom",
  '$.definitions.steps[].step["after-script"][].variables',
  "$.definitions.steps[].step.script[].variables",
  '$.pipelines.default[].step["after-script"][].variables',
  "$.pipelines.default[].step.script[].variables",
  '$.pipelines.default[].final["after-script"][].variables',
  "$.pipelines.default[].final.script[].variables",
  '$.pipelines.branches.*[].step["after-script"][].variables',
  "$.pipelines.branches.*[].step.script[].variables",
  '$.pipelines.branches.*[].stage.steps[].step["after-script"][].variables',
  "$.pipelines.branches.*[].stage.steps[].step.script[].variables",
  '$.pipelines.tags.*[].step["after-script"][].variables',
  "$.pipelines.tags.*[].step.script[].variables",
  '$.pipelines.tags.*[].parallel.steps[].step["after-script"][].variables',
  "$.pipelines.tags.*[].parallel.steps[].step.script[].variables",
  '$.pipelines["pull-requests"].*[].step["after-script"][].variables',
  '$.pipelines["pull-requests"].*[].step.script[].variables',
  '$.pipelines["pull-requests"].*[].parallel[].step["after-script"][].variables',
  '$.pipelines["pull-requests"].*[].parallel[].step.script[].variables',
  '$.pipelines["pull-requests"].*[].stage.steps[].step["after-script"][].variables',
  '$.pipelines["pull-requests"].*[].stage.steps[].step.script[].variables',
  '$.pipelines.custom.*[].step["after-script"][].variables',
  "$.pipelines.custom.*[].step.script[].variables",
  '$.pipelines.custom.*[].final["after-script"][].variables',
  "$.pipelines.custom.*[].final.script[].variables",
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
    for (const path of keyPaths(render(document.config, { header: "" }))) {
      paths.add(path);
    }
  }

  return [...paths].toSorted();
};

interface PathRewrite {
  readonly pattern: RegExp;
  readonly replacement: string;
}

/** A selector entry is an array position in the fixture and a map key in the document. */
const SELECTOR_REWRITES: readonly PathRewrite[] = [
  {
    pattern: /\$\.pipelines\.branches\[\d+\]\.pipeline\[\d+\]/gu,
    replacement: "$.pipelines.branches.*[]",
  },
  {
    pattern: /\$\.pipelines\.tags\[\d+\]\.pipeline\[\d+\]/gu,
    replacement: "$.pipelines.tags.*[]",
  },
  {
    pattern: /\$\.pipelines\["pull-requests"\]\[\d+\]\.pipeline\[\d+\]/gu,
    replacement: '$.pipelines["pull-requests"].*[]',
  },
  {
    pattern: /\$\.pipelines\.custom\[\d+\]\.pipeline\[\d+\]/gu,
    replacement: "$.pipelines.custom.*[]",
  },
];

const RAW_SEGMENT = /\.raw(?=\.|\[|$)/u;
const SEQUENCE_INDEX = /\[\d+\]/gu;

/**
 * A ledger row is written where the author put `raw`, and a fixture names array positions by index.
 * The gate compares modelled positions, so the raw layer goes and indices and selector names take
 * their normalised form.
 */
export const translateLedgerPath = (path: string): string => {
  const stripped = path.replace(RAW_SEGMENT, "");

  const mapped = SELECTOR_REWRITES.reduce(
    (current, rewrite) => current.replaceAll(rewrite.pattern, rewrite.replacement),
    stripped,
  );

  return mapped.replaceAll(SEQUENCE_INDEX, "[]");
};

/** Sorted and de-duplicated, because two items reaching for the same missing key are one gap. */
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
  config: PipelineConfig,
  modelled: readonly string[],
): readonly string[] => {
  const known = new Set(modelled);

  return unique(
    rawPathsOf(config)
      .map((path) => translateLedgerPath(path))
      .filter((path) => known.has(path)),
  );
};

/** The failure text a reader needs: the path, and both ways to make it legal. */
export const remediesFor = (path: string): string =>
  `${path} is not modelled; model it in the vocabulary, or express it through raw and declare it in the ledger`;
