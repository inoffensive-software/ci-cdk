import type { CoverageDebt } from "./coverage-debt.js";

/** One row per raw path this entry needs; `coverage-debt.ts` is the union the gate compares. */
export const GITLAB_PAGES_DEBT: readonly CoverageDebt[] = [
  {
    path: "$.raw.workflow",
    reason: "`workflow` is a pipeline keyword the vocabulary does not model.",
  },
  {
    path: "$.raw.include",
    reason:
      "`include` is a pipeline keyword the vocabulary does not model, component `rules` included.",
  },
  {
    path: "$.raw.default",
    reason: "`default` is a pipeline keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[0].raw.needs",
    reason: "`needs` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[0].raw.extends",
    reason: "`extends` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[0].raw.cache",
    reason: "`cache` is a job keyword the vocabulary does not model.",
  },
];
