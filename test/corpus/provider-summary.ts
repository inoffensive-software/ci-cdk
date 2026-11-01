import { GAP_CATEGORIES, type GapCategory } from "../schemas/gap-debt.js";

/** The facts one provider contributes to the README index. */
export interface ProviderSummary {
  readonly name: string;
  readonly subpath: string;
  readonly document: string;
  readonly documented: number;
  readonly gaps: readonly { readonly category: GapCategory }[];
  readonly overclaims: number;
}

/** The counts the index renders; category totals are expanded here so no page hand-counts. */
export interface ProviderCoverage {
  readonly name: string;
  readonly subpath: string;
  readonly document: string;
  readonly documented: number;
  readonly modelled: number;
  readonly counts: readonly { readonly category: GapCategory; readonly count: number }[];
  readonly overclaims: number;
}

export const coverageOf = (summary: ProviderSummary): ProviderCoverage => ({
  name: summary.name,
  subpath: summary.subpath,
  document: summary.document,
  documented: summary.documented,
  modelled: summary.documented - summary.gaps.length,
  counts: GAP_CATEGORIES.map((category) => ({
    category,
    count: summary.gaps.filter((gap) => gap.category === category).length,
  })),
  overclaims: summary.overclaims,
});
