import { pathReasonRows, type ReportTable } from "../report.js";
import { GAPS, OVERCLAIMS } from "./schema-gap.js";
import type { Gap, GapCategory } from "./schema-gap.js";

/** The per-row columns: what the schema allows and why it is not modelled. */
const PATH_REASON_HEADER: readonly string[] = ["Path", "Reason"];

const gapsOf = (category: GapCategory): readonly Gap[] =>
  GAPS.filter((gap) => gap.category === category);

/**
 * What the document's documented-grammar block renders: one table per category, then the overclaims.
 * GitLab reuses the same job-builder keywords at every job position, and the gate already normalises
 * that position to `$.*`, so no category repeats a shape and every row is listed once.
 */
export const GRAMMAR_TABLES: readonly ReportTable[] = [
  {
    heading: "### Unmodelled",
    header: PATH_REASON_HEADER,
    rows: pathReasonRows(gapsOf("unmodelled")),
  },
  {
    heading: "### Out of scope",
    header: PATH_REASON_HEADER,
    rows: pathReasonRows(gapsOf("out-of-scope")),
  },
  {
    heading: "### Schema noise",
    header: PATH_REASON_HEADER,
    rows: pathReasonRows(gapsOf("schema-noise")),
  },
  { heading: "### Overclaims", header: PATH_REASON_HEADER, rows: pathReasonRows(OVERCLAIMS) },
];
