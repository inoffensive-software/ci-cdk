/** One raw path a fixture needs, with the reason the vocabulary cannot express it yet. */
export interface CoverageDebt {
  readonly path: string;
  readonly reason: string;
}

const RUN_STYLE_REASON =
  "upstream writes a one-line run as a plain scalar; the modelled run field always emits a literal block";

/**
 * The roadmap. Every raw path a fixture is allowed to use, exactly: adding a row is a deliberate
 * change, and removing one is the definition of closing a gap. Paths use the diagnostic notation and
 * name the raw entry the author wrote, not the modelled key it stands in for.
 */
export const COVERAGE_DEBT: readonly CoverageDebt[] = [
  { path: "$.jobs[0].steps[2].raw.run", reason: RUN_STYLE_REASON },
  { path: "$.jobs[0].steps[3].raw.run", reason: RUN_STYLE_REASON },
];
