import { type Gap, type Overclaim, gapCategoryOf } from "../../schemas/gap-debt.js";
import debt from "./schema-gap-debt.json" with { type: "json" };

export { GAP_CATEGORIES } from "../../schemas/gap-debt.js";

export type { Gap, GapCategory, Overclaim } from "../../schemas/gap-debt.js";

/**
 * The roadmap of documented grammar this provider cannot emit, one row per missing keyword. Every row
 * came from the gate's own diff, never from the provider documentation, so the ledger measures the
 * schema rather than a reading of it. A row declares its whole subtree, so the first diff's 1097 leaf
 * paths collapse to the 53 keywords that account for them: modelling a keyword reveals the next layer
 * on the next run, and a row is only ever added when no row above it already covers the path. The rows
 * are JSON so the ledger stays data rather than source that outgrows the line limit. Adding a row
 * declares a path on purpose; deleting one is how a gap closes. A schema refresh fails the gate until
 * its new paths land here, per ADR 0011.
 */
export const GAPS: readonly Gap[] = debt.map((row) => ({
  path: row.path,
  reason: row.reason,
  category: gapCategoryOf(row.category),
}));

/**
 * Modelled paths the schema does not enumerate. Each row is a modelled shape GitLab accepts and the
 * pinned schema states too loosely for the walk to see; the gate proves both directions, so a row
 * cannot outlive the path it describes.
 */
export const OVERCLAIMS: readonly Overclaim[] = [
  {
    path: "$.default.image.entrypoint[]",
    reason:
      "the schema declares `image:entrypoint` as an array without `items`, so the walk reads the keyword but not its item; GitLab documents a list of strings, which is what the vocabulary emits",
  },
];
