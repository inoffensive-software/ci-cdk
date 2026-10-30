import type { CoverageDebt } from "./coverage-debt.js";

/** One row per raw path this entry needs; `coverage-debt.ts` is the union the gate compares. */
export const LABKIT_DEBT: readonly CoverageDebt[] = [
  {
    path: "$.jobs[19].raw.trigger",
    reason: "`trigger` is a job keyword the vocabulary does not model.",
  },
];
