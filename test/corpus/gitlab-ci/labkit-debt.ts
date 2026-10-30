import type { CoverageDebt } from "./coverage-debt.js";

/** One row per raw path this entry needs; `coverage-debt.ts` is the union the gate compares. */
export const LABKIT_DEBT: readonly CoverageDebt[] = [
  {
    path: "$.jobs[0].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[1].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[2].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[3].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[4].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[5].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[6].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[8].raw.parallel",
    reason: "`parallel` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[9].raw.parallel",
    reason: "`parallel` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[13].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[14].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[18].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[19].raw.needs",
    reason: "`needs` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[19].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
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
  {
    path: "$.jobs[23].raw.needs",
    reason: "`needs` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[24].raw.needs",
    reason: "`needs` is a job keyword the vocabulary does not model.",
  },
];
