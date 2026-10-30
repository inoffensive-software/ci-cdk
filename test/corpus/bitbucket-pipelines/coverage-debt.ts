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
 *
 * The step body is modelled through ticket 48, and `aligent-graphql-mesh` has not landed yet, so the
 * four entries present need no raw at all. Ticket 47 must land its entry with an empty ledger too.
 */
export const COVERAGE_DEBT: readonly CoverageDebt[] = [];
