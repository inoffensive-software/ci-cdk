import type { CoverageDebt } from "./coverage-debt.js";

/** One row per raw path this entry needs; `coverage-debt.ts` is the union the gate compares. */
export const TERRAFORM_IMAGES_DEBT: readonly CoverageDebt[] = [
  {
    path: "$.jobs[4].raw.release",
    reason: "`release` is a job keyword the vocabulary does not model.",
  },
];
