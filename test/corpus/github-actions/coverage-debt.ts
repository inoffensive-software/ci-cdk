/** One raw path a fixture needs, with the reason it is there. */
export interface CoverageDebt {
  readonly path: string;
  readonly reason: string;
}

const RUN_STYLE_REASON =
  "byte-fidelity only: upstream writes a one-line run as a plain scalar and the modelled run field emits a literal block";

/**
 * The roadmap. Every raw path a fixture is allowed to use, exactly: adding a row is a deliberate
 * change, and removing one is the definition of closing a gap. Paths use the diagnostic notation and
 * name the raw entry the author wrote, not the modelled key it stands in for.
 *
 * A row is either a vocabulary gap (the key is unmodelled) or a byte-fidelity device (the key is
 * modelled but its emitted style differs, and the entry is compared byte for byte). Only the first
 * kind counts as coverage debt.
 */
export const COVERAGE_DEBT: readonly CoverageDebt[] = [
  { path: "$.jobs[0].steps[2].raw.run", reason: RUN_STYLE_REASON },
  { path: "$.jobs[0].steps[3].raw.run", reason: RUN_STYLE_REASON },
];
