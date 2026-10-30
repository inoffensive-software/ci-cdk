import type { CoverageDebt } from "./coverage-debt.js";

/** One row per raw path this entry needs; `coverage-debt.ts` is the union the gate compares. */
export const TERRAFORM_IMAGES_DEBT: readonly CoverageDebt[] = [
  {
    path: "$.raw.workflow",
    reason: "`workflow` is a pipeline keyword the vocabulary does not model.",
  },
  {
    path: "$.raw.variables",
    reason: "Global `variables` is a pipeline keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[0].raw.image",
    reason: "`image` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[0].raw.before_script",
    reason: "`before_script` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[1].raw.image",
    reason: "`image` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[1].raw.before_script",
    reason: "`before_script` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[2].raw.extends",
    reason: "`extends` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[2].raw.services",
    reason: "`services` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[2].raw.image",
    reason: "`image` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[2].raw.before_script",
    reason: "`before_script` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[3].raw.extends",
    reason: "`extends` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[3].raw.variables",
    reason: "Job-level `variables` is a keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[3].raw.image",
    reason: "`image` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[3].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[4].raw.needs",
    reason: "`needs` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[4].raw.image",
    reason: "`image` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[4].raw.rules",
    reason: "`rules` is a job keyword the vocabulary does not model.",
  },
  {
    path: "$.jobs[4].raw.release",
    reason: "`release` is a job keyword the vocabulary does not model.",
  },
];
