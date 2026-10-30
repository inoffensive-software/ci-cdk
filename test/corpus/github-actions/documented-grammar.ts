import { gapRows, pathReasonRows, type ReportTable } from "../report.js";
import { GAPS, OVERCLAIMS } from "./schema-gap.js";

/** The gap columns, in the order a reader needs them: what, how bad, why. */
const GAP_HEADER: readonly string[] = ["Path", "Category", "Reason"];

/** An overclaim carries no category: every one is either a stale schema or a bug. */
const OVERCLAIM_HEADER: readonly string[] = ["Path", "Reason"];

/** The cell an empty table gets, so the table is present and says why it has no rows. */
const NO_OVERCLAIMS: readonly string[] = [
  "—",
  "No overclaims: every modelled path is allowed by the schema.",
];

/**
 * What the document's documented-grammar block renders: every gap under one table, then the
 * overclaims. The counts come from the same lists, so the lead and the rows cannot disagree.
 */
export const GRAMMAR_TABLES: readonly ReportTable[] = [
  { header: GAP_HEADER, rows: gapRows(GAPS) },
  { header: OVERCLAIM_HEADER, rows: pathReasonRows(OVERCLAIMS), emptyRow: NO_OVERCLAIMS },
];
