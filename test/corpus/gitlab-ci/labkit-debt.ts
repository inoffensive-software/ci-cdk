import type { CoverageDebt } from "./coverage-debt.js";

/** One row per raw path this entry needs; `coverage-debt.ts` is the union the gate compares. */
export const LABKIT_DEBT: readonly CoverageDebt[] = [
  {
    path: "$.jobs[8].raw.parallel",
    reason: "`parallel` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[9].raw.parallel",
    reason: "`parallel` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[19].raw.trigger",
    reason: "`trigger` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[20].raw.parallel",
    reason: "`parallel` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[21].raw.parallel",
    reason: "`parallel` is a job keyword the vocabulary does not model.",
  },
];
