import debt from "./schema-gap-debt.json" with { type: "json" };

/**
 * The only categories a gap may carry. `unmodelled` is debt the provider should pay; `out-of-scope`
 * is a shape the provider document already names as a non-goal; `schema-noise` is grammar the schema
 * permits that GitLab does not document.
 */
export const GAP_CATEGORIES = ["unmodelled", "out-of-scope", "schema-noise"] as const;

export type GapCategory = (typeof GAP_CATEGORIES)[number];

/** A schema path the vocabulary cannot emit, with the debt it represents. */
export interface Gap {
  readonly path: string;
  readonly reason: string;
  readonly category: GapCategory;
}

/** A modelled path the schema does not enumerate, with the disagreement named. */
export interface Overclaim {
  readonly path: string;
  readonly reason: string;
}

/** The category a row claims, refused here so an open string cannot reach the report. */
const categoryOf = (value: string): GapCategory => {
  const found = GAP_CATEGORIES.find((category) => category === value);

  if (found === undefined) {
    throw new Error(`${JSON.stringify(value)} is not a gap category`);
  }

  return found;
};

/**
 * The roadmap of documented grammar this provider cannot emit, one row per schema path. Every row
 * came from the gate's own diff, never from the provider documentation, so the ledger measures the
 * schema rather than a reading of it. The rows are JSON because the first diff is 1097 of them: a
 * person writes the reasons, the walker names the paths, and the file stays a data ledger rather than
 * source that outgrows the line limit. Adding a row declares a path on purpose; deleting one is how a
 * gap closes. A schema refresh fails the gate until its new paths land here, per ADR 0011.
 */
export const GAPS: readonly Gap[] = debt.map((row) => ({
  path: row.path,
  reason: row.reason,
  category: categoryOf(row.category),
}));

/**
 * Modelled paths the schema does not enumerate. The first diff found none, and an empty list is a
 * claim the test below proves: every path the inventory emits is in the schema.
 */
export const OVERCLAIMS: readonly Overclaim[] = [];
