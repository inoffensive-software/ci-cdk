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
    path: "$.definitions.steps[0].step.raw.artifacts",
    reason: "step artifacts are ticket 48; the shared step group declares its reports glob raw",
  },
  {
    path: "$.pipelines.branches[0].pipeline[0].step.raw.artifacts",
    reason: "step artifacts are ticket 48; the main branch resolves the shared step's anchor",
  },
  {
    path: "$.pipelines.branches[1].pipeline[0].step.raw.artifacts",
    reason: "step artifacts are ticket 48; the develop branch resolves the shared step's anchor",
  },
  {
    path: '$.pipelines["pull-requests"][0].pipeline[0].step.raw.artifacts',
    reason: "step artifacts are ticket 48; the pull-request selector resolves the shared step",
  },
  {
    path: "$.pipelines.tags[0].pipeline[0].step.raw.artifacts",
    reason: "step artifacts are ticket 48; the tag selector resolves the shared step",
  },
];
