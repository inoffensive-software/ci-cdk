import type { CoverageReport, GrammarArea } from "../report.js";
import { LEDGER_RULES } from "./exhaustiveness.js";

/**
 * The grouping the document presents. The three areas are the document's own sections: what one
 * pipeline file declares once, the reusable definitions, and the pipeline sections that repeat the
 * item grammar. Every modelled path must land in exactly one area, or the generator throws rather
 * than dropping it from the table.
 */
const GRAMMAR_AREAS: readonly GrammarArea[] = [
  {
    name: "Document",
    prefixes: ["$.image", "$.clone", "$.labels", "$.options", "$.triggers"],
  },
  {
    name: "Definitions",
    prefixes: ["$.definitions"],
  },
  {
    name: "Pipelines",
    prefixes: ["$.pipelines"],
  },
];

/**
 * Every pipeline section repeats the same item grammar, so a key is displayed once per shape rather
 * than once per position. A section prefix is replaced by `$.pipelines.*`, which keeps the trailing
 * sequence marker the path already carries.
 */
const SECTION_PREFIXES: readonly string[] = [
  "$.pipelines.default",
  "$.pipelines.branches.*",
  "$.pipelines.tags.*",
  '$.pipelines["pull-requests"].*',
  "$.pipelines.custom.*",
];

/** An item wrapper carries no grammar of its own, so it displays as `.item` at every position. */
const ITEM_WRAPPERS: readonly string[] = [
  ".stage.steps[].step",
  ".parallel.steps[].step",
  ".parallel[].step",
  ".final",
  ".step",
];

const escapeForRegExp = (text: string): string => text.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/**
 * The display form of a key path: a pipeline section becomes `$.pipelines.*`, and every item wrapper
 * below it becomes `.item`. Nothing else changes, so a path outside the repeated positions keeps its
 * exact spelling. Collapsing is display only; the inventory itself still holds every position.
 */
export const collapsePosition = (path: string): string => {
  const section = SECTION_PREFIXES.find(
    (prefix) => path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`),
  );

  const collapsed = section === undefined ? path : `$.pipelines.*${path.slice(section.length)}`;

  return ITEM_WRAPPERS.reduce(
    (current, wrapper) =>
      current.replaceAll(new RegExp(`${escapeForRegExp(wrapper)}(?=\\.|\\[|$)`, "gu"), ".item"),
    collapsed,
  );
};

/** The distinct display keys of a path set, sorted; the coverage table groups by the same keys. */
export const displayKeysOf = (modelled: readonly string[]): readonly string[] =>
  [...new Set(modelled.map(collapsePosition))].toSorted();

/**
 * What the document's coverage block renders. Bitbucket repeats its step grammar at every pipeline
 * position, so the table shows the collapsed display key and the number of positions it stands for,
 * and leads with both counts.
 */
export const COVERAGE_TABLE: Omit<CoverageReport, "modelled" | "corpus" | "ledger"> = {
  areas: GRAMMAR_AREAS,
  header: ["Area", "Keys", "Corpus entries"],
  emptyCell: "—",
  keyOf: collapsePosition,
  positionsNote: (positions) => ` (x${String(positions)})`,
  lead: (modelled, keys) =>
    `${String(modelled)} modelled paths collapse to ${String(keys)} display keys.`,
  ledgerPathOf: LEDGER_RULES.translate,
};
