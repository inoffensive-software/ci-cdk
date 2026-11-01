import type { CoverageReport, GrammarArea } from "../report.js";
import { LEDGER_RULES } from "./exhaustiveness.js";

/**
 * The grouping the document presents, following the sections of GitLab's own syntax reference: the
 * pipeline-level keywords, then the job keywords grouped by what they configure. `exact` lists leaves
 * whose siblings belong somewhere else; `prefixes` owns a subtree, including the key itself and every
 * path below it. Every modelled path must land in exactly one area, or the generator throws rather
 * than dropping it from the table.
 */
const GRAMMAR_AREAS: readonly GrammarArea[] = [
  {
    name: "Pipeline",
    prefixes: ["$.stages", "$.variables"],
  },
  {
    name: "Defaults",
    prefixes: ["$.default"],
  },
  {
    name: "Include",
    prefixes: ["$.include"],
  },
  {
    name: "Workflow",
    prefixes: ["$.workflow"],
  },
  {
    name: "Job identity",
    exact: ["$.*", "$.*.stage", "$.*.extends", "$.*.extends[]", "$.*.tags", "$.*.tags[]"],
    prefixes: [],
  },
  {
    name: "Image and services",
    prefixes: ["$.*.image", "$.*.services"],
  },
  {
    name: "Job variables",
    prefixes: ["$.*.variables"],
  },
  {
    name: "Scripts",
    prefixes: ["$.*.before_script", "$.*.script", "$.*.after_script", "$.*.hooks"],
  },
  {
    name: "Inheritance",
    prefixes: ["$.*.inherit"],
  },
  {
    name: "Dependencies",
    prefixes: ["$.*.dependencies"],
  },
  {
    name: "Secrets",
    prefixes: ["$.*.secrets"],
  },
  {
    name: "Rules",
    prefixes: ["$.*.rules"],
  },
  {
    name: "Needs",
    prefixes: ["$.*.needs"],
  },
  {
    name: "Cache",
    prefixes: ["$.*.cache"],
  },
  {
    name: "Artifacts",
    prefixes: ["$.*.artifacts"],
  },
  {
    name: "Environment",
    prefixes: ["$.*.environment"],
  },
  {
    name: "Release",
    prefixes: ["$.*.release"],
  },
  {
    name: "Trigger",
    prefixes: ["$.*.trigger"],
  },
  {
    name: "Parallel",
    prefixes: ["$.*.parallel"],
  },
  {
    name: "Retry",
    prefixes: ["$.*.retry"],
  },
  {
    name: "DAST",
    prefixes: ["$.*.dast_configuration"],
  },
  {
    name: "Scheduling",
    exact: [
      "$.*.when",
      "$.*.allow_failure",
      "$.*.allow_failure.exit_codes",
      "$.*.allow_failure.exit_codes[]",
      "$.*.interruptible",
      "$.*.timeout",
      "$.*.resource_group",
      "$.*.coverage",
      "$.*.start_in",
      "$.*.manual_confirmation",
    ],
    prefixes: [],
  },
];

/**
 * What the document's coverage block renders. GitLab mixes pipeline keywords with job names at the
 * root, which the gate normalises to `$.*`, so each key is modelled once and shown under its own
 * spelling; the coverage generator needs nothing but the areas and the column headings.
 */
export const COVERAGE_TABLE: Omit<CoverageReport, "modelled" | "corpus" | "ledger"> = {
  areas: GRAMMAR_AREAS,
  header: ["Area", "Modelled paths", "Corpus entries"],
  emptyCell: "",
  ledgerPathOf: LEDGER_RULES.translate,
};
