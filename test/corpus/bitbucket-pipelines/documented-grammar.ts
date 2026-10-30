import type { Gap, GapCategory, Overclaim } from "./schema-gap-debt.js";
import { GAP_CATEGORIES } from "./schema-gap-debt.js";
import { collapsePosition, formatTable } from "./coverage-table.js";

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

const byPath = (left: { readonly path: string }, right: { readonly path: string }): number => {
  if (left.path === right.path) {
    return 0;
  }

  return left.path < right.path ? -1 : 1;
};

const perCategory = (gaps: readonly Gap[]): string =>
  GAP_CATEGORIES.map(
    (category: GapCategory) =>
      `${category} ${String(gaps.filter((gap) => gap.category === category).length)}`,
  ).join(", ");

const sectionsOf = (gaps: readonly Gap[], category: GapCategory): readonly (readonly string[])[] =>
  gaps
    .filter((gap) => gap.category === category)
    .toSorted(byPath)
    .map((gap) => [`\`${gap.path}\``, gap.reason]);

/**
 * Out-of-scope gaps are per-position copies of a handful of shapes. Grouping by the same display key
 * the coverage table uses turns 529 rows into one row per shape, and the count says how many
 * positions the shape covers. A group whose rows disagree on the reason is a ledger error, so it
 * throws rather than picking one silently.
 */
const outOfScopeGroups = (gaps: readonly Gap[]): readonly OutOfScopeGroup[] => {
  const groups = new Map<string, Gap[]>();

  for (const gap of gaps.filter((row) => row.category === "out-of-scope")) {
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

const groupedRows = (groups: readonly OutOfScopeGroup[]): readonly (readonly string[])[] =>
  groups.map((group) => [`\`${group.key}\``, String(group.positions.length), group.reason]);

/**
 * The document's documented-grammar block: the counts, then each category in its own table. Gaps the
 * vocabulary could model are listed individually; repeated non-goals are grouped by display key;
 * overclaims are listed individually. `schema` is the walker's path set, so the count follows the
 * pinned schema rather than prose, and every list is sorted so two runs render the same block.
 */
export const renderDocumentedGrammar = (
  schema: readonly string[],
  gaps: readonly Gap[],
  overclaims: readonly Overclaim[],
): string => {
  const counts = [
    `${String(schema.length)} documented paths.`,
    `Gaps: ${String(gaps.length)} (${perCategory(gaps)}).`,
    `Overclaims: ${String(overclaims.length)}.`,
  ].join(" ");

  const unmodelled = sectionsOf(gaps, "unmodelled");
  const schemaNoise = sectionsOf(gaps, "schema-noise");

  const overclaimRows = overclaims
    .toSorted(byPath)
    .map((overclaim) => [`\`${overclaim.path}\``, overclaim.reason]);

  return [
    counts,
    "### Unmodelled",
    formatTable(PATH_REASON_HEADER, unmodelled),
    "### Out of scope",
    formatTable(GROUPED_HEADER, groupedRows(outOfScopeGroups(gaps))),
    "### Schema noise",
    formatTable(PATH_REASON_HEADER, schemaNoise),
    "### Overclaims",
    formatTable(PATH_REASON_HEADER, overclaimRows),
  ].join("\n\n");
};
