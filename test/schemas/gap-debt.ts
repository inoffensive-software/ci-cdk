/**
 * The only categories a gap may carry. `unmodelled` is debt the provider should pay; `out-of-scope`
 * is a shape the provider document already names as a non-goal; `schema-noise` is grammar the schema
 * permits that the provider does not document.
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
export const gapCategoryOf = (value: string): GapCategory => {
  const found = GAP_CATEGORIES.find((category) => category === value);

  if (found === undefined) {
    throw new Error(`${JSON.stringify(value)} is not a gap category`);
  }

  return found;
};
