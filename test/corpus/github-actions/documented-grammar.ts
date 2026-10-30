import type { Gap, GapCategory, Overclaim } from "./schema-gap-debt.js";
import { GAP_CATEGORIES } from "./schema-gap-debt.js";
import { formatTable } from "./coverage-table.js";

/** The gap columns, in the order a reader needs them: what, how bad, why. */
const GAP_HEADER: readonly string[] = ["Path", "Category", "Reason"];

/** An overclaim carries no category: every one is either a stale schema or a bug. */
const OVERCLAIM_HEADER: readonly string[] = ["Path", "Reason"];

/** The cell an empty table gets, so the table is present and says why it has no rows. */
const NONE: readonly string[] = [
  "—",
  "No overclaims: every modelled path is allowed by the schema.",
];

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

/**
 * The document's documented-grammar block: the counts, the gaps by category and the overclaims.
 * `schema` is the walker's path set, so the count follows the pinned schema rather than prose, and
 * every row is sorted by path so two runs render the same block.
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

  const gapRows = gaps
    .toSorted(byPath)
    .map((gap) => [`\`${gap.path}\``, `\`${gap.category}\``, gap.reason]);

  const overclaimRows =
    overclaims.length === 0
      ? [NONE]
      : overclaims.toSorted(byPath).map((overclaim) => [`\`${overclaim.path}\``, overclaim.reason]);

  return [
    counts,
    formatTable(GAP_HEADER, gapRows),
    formatTable(OVERCLAIM_HEADER, overclaimRows),
  ].join("\n\n");
};
