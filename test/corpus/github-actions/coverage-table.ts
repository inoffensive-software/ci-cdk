import type { CoverageReport, GrammarArea } from "../report.js";
import { LEDGER_RULES } from "./exhaustiveness.js";

/**
 * The grouping the document presents. `exact` lists leaves whose siblings belong somewhere else;
 * `prefixes` owns a subtree, including the key itself and every path below it. Every modelled path
 * must land in exactly one area, or the generator throws rather than dropping it from the table.
 */
const GRAMMAR_AREAS: readonly GrammarArea[] = [
  {
    name: "Workflow identity",
    exact: ["$.name", '$["run-name"]'],
    prefixes: [],
  },
  {
    name: "Triggers",
    exact: [],
    prefixes: ["$.on"],
  },
  {
    name: "Permissions",
    exact: [],
    prefixes: ["$.permissions", "$.jobs.*.permissions"],
  },
  {
    name: "Caching",
    exact: [],
    prefixes: ['$["cache-mode"]', '$.jobs.*["cache-mode"]'],
  },
  {
    name: "Workflow env",
    exact: [],
    prefixes: ["$.env"],
  },
  {
    name: "Workflow defaults",
    exact: [],
    prefixes: ["$.defaults"],
  },
  {
    name: "Concurrency",
    exact: [],
    prefixes: ["$.concurrency", "$.jobs.*.concurrency"],
  },
  {
    name: "Job body",
    exact: [
      "$.jobs",
      "$.jobs.*",
      "$.jobs.*.if",
      "$.jobs.*.name",
      "$.jobs.*.needs",
      "$.jobs.*.needs[]",
      "$.jobs.*.outputs",
      "$.jobs.*.outputs.*",
      '$.jobs.*["continue-on-error"]',
      '$.jobs.*["runs-on"]',
      '$.jobs.*["runs-on"][]',
      '$.jobs.*["timeout-minutes"]',
    ],
    prefixes: [],
  },
  {
    name: "Reusable-workflow calls",
    exact: ["$.jobs.*.uses"],
    prefixes: ["$.jobs.*.with", "$.jobs.*.secrets"],
  },
  {
    name: "Environment",
    exact: [],
    prefixes: ["$.jobs.*.environment"],
  },
  {
    name: "Strategy and matrix",
    exact: [],
    prefixes: ["$.jobs.*.strategy"],
  },
  {
    name: "Steps",
    exact: [],
    prefixes: ["$.jobs.*.steps"],
  },
  {
    name: "Containers",
    exact: [],
    prefixes: ["$.jobs.*.container"],
  },
  {
    name: "Services",
    exact: [],
    prefixes: ["$.jobs.*.services"],
  },
  {
    name: "Job env",
    exact: [],
    prefixes: ["$.jobs.*.env"],
  },
  {
    name: "Job defaults",
    exact: [],
    prefixes: ["$.jobs.*.defaults"],
  },
];

/**
 * What the document's coverage block renders. A path is shown under its own spelling, because this
 * provider models each key once, so the coverage generator needs nothing but the areas and the
 * column headings.
 */
export const COVERAGE_TABLE: Omit<CoverageReport, "modelled" | "corpus" | "ledger"> = {
  areas: GRAMMAR_AREAS,
  header: ["Area", "Modelled paths", "Corpus entries"],
  emptyCell: "",
  ledgerPathOf: LEDGER_RULES.translate,
};
