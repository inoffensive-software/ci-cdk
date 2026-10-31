import { type Gap, type Overclaim, gapCategoryOf } from "../../schemas/gap-debt.js";
import debt from "./schema-gap-debt.json" with { type: "json" };

export type { Gap, Overclaim } from "../../schemas/gap-debt.js";

/**
 * The roadmap of documented grammar this provider cannot emit, one row per missing keyword. Every row
 * came from the gate's own diff, never from the provider documentation, so the ledger measures the
 * schema rather than a reading of it. A row declares its whole subtree, so the first diff's 1097 leaf
 * paths collapse to the 53 keywords that account for them: modelling a keyword reveals the next layer
 * on the next run, and a row is only ever added when no row above it already covers the path. The rows
 * are JSON so the ledger stays data rather than source that outgrows the line limit. Adding a row
 * declares a path on purpose; deleting one is how a gap closes. A row whose path the vocabulary now
 * models is stale, so the gate fails until it is deleted or narrowed to the still-missing children.
 * A schema refresh fails the gate until its new paths land here, per ADR 0011.
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
    path: "$.*.image.entrypoint[]",
    reason:
      "the schema declares a job's `image:entrypoint` as an array without `items`, so the walk reads the keyword but not its item; GitLab documents a list of strings, which is what the vocabulary emits",
  },
  {
    path: "$.*.parallel.matrix[].*[]",
    reason:
      "a `parallel:matrix` cell written as a list; the schema declares the cell as an array without `items`, so the walk reads the cell but not its item, while the corpus lists several values in one cell",
  },
  {
    path: "$.default.image.entrypoint[]",
    reason:
      "the schema declares `image:entrypoint` as an array without `items`, so the walk reads the keyword but not its item; GitLab documents a list of strings, which is what the vocabulary emits",
  },
  {
    path: "$.pages.image.entrypoint[]",
    reason:
      "the schema declares `image:entrypoint` as an array without `items`, so the walk reads the keyword but not its item; the pages job shares the job body, and GitLab documents a list of strings",
  },
  {
    path: "$.pages.parallel.matrix[].*[]",
    reason:
      "a `parallel:matrix` cell written as a list in the pages job; the schema declares the cell as an array without `items`, so the walk reads the cell but not its item",
  },
];
