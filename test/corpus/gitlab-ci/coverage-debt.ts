/** One raw path a fixture needs, with the reason it is there. */
export interface CoverageDebt {
  readonly path: string;
  readonly reason: string;
}

/**
 * The roadmap. Every raw path a fixture is allowed to use, exactly: adding a row is a deliberate
 * change, and removing one is the definition of closing a gap. Paths use the diagnostic notation and
 * name the raw entry the author wrote, not the modelled key it stands in for.
 *
 * A row is always a vocabulary gap: the key has no modelled field. An empty ledger means the
 * vocabulary can express every key the corpus uses.
 */
export const COVERAGE_DEBT: readonly CoverageDebt[] = [
  {
    path: "$.raw.workflow",
    reason: "`workflow` is a pipeline keyword the vocabulary does not model.",
  },
  {
    path: "$.raw.variables",
    reason: "Global `variables` is a pipeline keyword the vocabulary does not model.",
  },
  {
    path: '$.raw[".terraform-versions"]',
    reason: "A hidden template is a pipeline entry the vocabulary does not model.",
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
