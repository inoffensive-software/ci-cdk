import type { CoverageDebt } from "./coverage-debt.js";

/**
 * One row per raw path this entry needs; `coverage-debt.ts` is the union the gate compares. Empty:
 * the entry's only `raw` key was `trigger`, which the vocabulary now models.
 */
export const LABKIT_DEBT: readonly CoverageDebt[] = [];
