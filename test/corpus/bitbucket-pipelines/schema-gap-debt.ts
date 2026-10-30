import { type Gap, type Overclaim, gapCategoryOf } from "../../schemas/gap-debt.js";
import overclaims from "./schema-gap-overclaims.json" with { type: "json" };
import debt from "./schema-gap-debt.json" with { type: "json" };

export { GAP_CATEGORIES } from "../../schemas/gap-debt.js";

export type { Gap, GapCategory, Overclaim } from "../../schemas/gap-debt.js";

/**
 * The documented grammar this provider cannot emit, one row per missing keyword. Every row came from
 * the gate's own diff, never from the provider documentation, so the ledger measures the schema
 * rather than a reading of it. A row declares its whole subtree, so the walk's leaf paths collapse to
 * the 338 keywords that account for them: modelling a keyword reveals the next layer on the next
 * run, and a row is only ever added when no row above it already covers the path.
 *
 * Most `unmodelled` rows are not missing vocabulary. Bitbucket repeats the step grammar in every
 * pipeline section and inside stages and parallel groups, and the inventory exercises a keyword in
 * one position rather than all of them, so a row whose reason says the vocabulary models it records
 * inventory breadth to close, not a field to add. The rows are JSON so the ledger stays data rather
 * than source that outgrows the line limit. Adding a row declares a path on purpose; deleting one is
 * how a gap closes. A schema refresh fails the gate until its new paths land here, per ADR 0011.
 */
export const GAPS: readonly Gap[] = debt.map((row) => ({
  path: row.path,
  reason: row.reason,
  category: gapCategoryOf(row.category),
}));

/**
 * Modelled paths the schema does not enumerate. Each row names a shape Bitbucket documents and the
 * pinned schema either omits or forbids, so the vocabulary is right and the schema is the side that
 * has drifted; the gate proves both directions, so a row cannot outlive the path it describes.
 */
export const OVERCLAIMS: readonly Overclaim[] = overclaims.map((row) => ({
  path: row.path,
  reason: row.reason,
}));
