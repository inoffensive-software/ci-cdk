import { pathReasonRows, type ReportTable } from "../report.js";
import { collapsePosition } from "./coverage-table.js";
import { GAPS, OVERCLAIMS, type Gap, type GapCategory } from "./schema-gap.js";

/** The per-row columns: what the schema allows and why it is not modelled. */
const PATH_REASON_HEADER: readonly string[] = ["Path", "Reason"];

/** A repeated position is counted rather than listed, so one row stands for every section. */
const GROUPED_HEADER: readonly string[] = ["Key", "Positions", "Reason"];

/** One grouped out-of-scope shape: the display key, the positions it covers and their shared reason. */
interface OutOfScopeGroup {
  readonly key: string;
  readonly positions: readonly string[];
  readonly reason: string;
}

const gapsOf = (category: GapCategory): readonly Gap[] =>
  GAPS.filter((gap) => gap.category === category);

/**
 * Out-of-scope gaps are per-position copies of a handful of shapes. Grouping by the same display key
 * the coverage table uses turns 529 rows into one row per shape, and the count says how many
 * positions the shape covers. A group whose rows disagree on the reason is a ledger error, so it
 * throws rather than picking one silently.
 */
const outOfScopeGroups = (): readonly OutOfScopeGroup[] => {
  const groups = new Map<string, Gap[]>();

  for (const gap of gapsOf("out-of-scope")) {
    const key = collapsePosition(gap.path);
    groups.set(key, [...(groups.get(key) ?? []), gap]);
  }

  return [...groups.entries()]
    .toSorted(([left], [right]) => (left < right ? -1 : 1))
    .map(([key, rows]) => {
      const positions = rows.map((row) => row.path).toSorted();
      const reasons = new Set(rows.map((row) => row.reason));

      if (reasons.size !== 1) {
        throw new Error(`${key} has ${String(reasons.size)} reasons across its positions`);
      }

      return { key, positions, reason: rows[0]?.reason ?? "" };
    });
};

const outOfScopeRows = (): readonly (readonly string[])[] =>
  outOfScopeGroups().map((group) => [
    `\`${group.key}\``,
    String(group.positions.length),
    group.reason,
  ]);

/**
 * What the document's documented-grammar block renders: each category in its own table. Gaps the
 * vocabulary could model are listed individually; repeated non-goals are grouped by display key;
 * overclaims are listed individually.
 */
export const GRAMMAR_TABLES: readonly ReportTable[] = [
  {
    heading: "### Unmodelled",
    header: PATH_REASON_HEADER,
    rows: pathReasonRows(gapsOf("unmodelled")),
  },
  { heading: "### Out of scope", header: GROUPED_HEADER, rows: outOfScopeRows() },
  {
    heading: "### Schema noise",
    header: PATH_REASON_HEADER,
    rows: pathReasonRows(gapsOf("schema-noise")),
  },
  { heading: "### Overclaims", header: PATH_REASON_HEADER, rows: pathReasonRows(OVERCLAIMS) },
];
