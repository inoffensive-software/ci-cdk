import { parse } from "yaml";

import type { LedgerRules } from "../gate.js";
import { walkPaths, type YamlNode } from "../paths.js";

/**
 * Map keys that belong to the author, not to the provider. A child directly under one of these paths
 * is a name the author chose, so the gate normalises it to `*`; two names at the same position are
 * the same grammar. Sequence positions become `[]` for the same reason.
 *
 * The list is written in the gate's notation, not the source's, so `$.pipelines.branches.*[]` is the
 * body of any selector entry. A test asserts every entry occurs in the inventory, so a typo excludes
 * nothing silently.
 */
const SELECTORS: readonly string[] = [
  "$.pipelines.default",
  "$.pipelines.branches.*",
  "$.pipelines.tags.*",
  '$.pipelines["pull-requests"].*',
  "$.pipelines.custom.*",
];

/** Every position a step body is written in, which is where a pipe's variables map can appear. */
const STEP_BODIES: readonly string[] = [
  "$.definitions.steps[].step",
  ...SELECTORS.flatMap((section) => [
    `${section}[].step`,
    `${section}[].parallel[].step`,
    `${section}[].parallel.steps[].step`,
    `${section}[].stage.steps[].step`,
    `${section}[].final`,
  ]),
];

export const AUTHOR_NAMED: readonly string[] = [
  "$.labels",
  "$.triggers",
  "$.definitions.caches",
  "$.definitions.services",
  "$.definitions.services.*.variables",
  "$.pipelines.branches",
  "$.pipelines.tags",
  '$.pipelines["pull-requests"]',
  "$.pipelines.custom",
  ...STEP_BODIES.flatMap((body) => [
    `${body}["after-script"][].variables`,
    `${body}.script[].variables`,
  ]),
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
const translateLedgerPath = (path: string): string => {
  const stripped = path.replace(RAW_SEGMENT, "");

  const mapped = SELECTOR_REWRITES.reduce(
    (current, rewrite) => current.replaceAll(rewrite.pattern, rewrite.replacement),
    stripped,
  );

  return mapped.replaceAll(SEQUENCE_INDEX, "[]");
};

/** The ledger notation on its own: a row is written at the raw layer, over indexed positions. */
export const LEDGER_RULES: LedgerRules = { translate: translateLedgerPath };
