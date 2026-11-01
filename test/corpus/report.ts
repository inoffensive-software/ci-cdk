/**
 * The generated blocks a provider page carries: corpus coverage by grammar area, the open-gaps
 * ledger and the documented-grammar counts with their tables. A page supplies its areas, its
 * entries and its declared rows, so nothing here knows a provider.
 */

/** One grammar area: the paths it owns, named exactly or by owning a subtree. */
export interface GrammarArea {
  readonly name: string;
  readonly exact?: readonly string[];
  readonly prefixes: readonly string[];
}

/** The key paths one corpus entry uses, already normalised by the gate's walk. */
export interface CorpusPaths {
  readonly name: string;
  readonly paths: readonly string[];
}

/** A ledger row: a raw path a fixture needs, with the reason it is there. */
export interface LedgerRow {
  readonly path: string;
  readonly reason: string;
}

/** A gap row: a documented path the provider cannot emit, with its category and reason. */
export interface GapRow {
  readonly path: string;
  readonly category: string;
  readonly reason: string;
}

/** An overclaim row: a modelled path the schema does not allow, with the reason it stays modelled. */
export interface OverclaimRow {
  readonly path: string;
  readonly reason: string;
}

/** One table cell per column, already formatted for display. */
export type ReportRow = readonly string[];

/** One table in a block, with an optional heading and an optional row for an empty body. */
export interface ReportTable {
  readonly heading?: string;
  readonly header: readonly string[];
  readonly rows: readonly ReportRow[];
  readonly emptyRow?: ReportRow;
}

/**
 * Everything the coverage block needs. `keyOf` is the display form of a modelled path, so a page
 * that repeats its grammar can show one row per shape; `positionsNote` then labels a key by how many
 * positions it stands for. `lead` is the page's own sentence: the wording is prose, the counts are
 * computed here.
 */
export interface CoverageReport {
  readonly areas: readonly GrammarArea[];
  readonly modelled: readonly string[];
  readonly corpus: readonly CorpusPaths[];
  /** The ledger's paths, so a corpus key declared through `raw` is not reported as unknown. */
  readonly ledger: readonly string[];
  readonly header: readonly string[];
  /** The cell an area gets when it owns no key, so the table never shows a blank row. */
  readonly emptyCell: string;
  readonly keyOf?: (path: string) => string;
  readonly positionsNote?: (positions: number) => string;
  readonly lead?: (modelled: number, keys: number) => string;
  /** The modelled path a ledger path stands in for, where the raw spelling differs from it. */
  readonly ledgerPathOf?: (path: string) => string;
}

/** Everything the documented-grammar block needs: the counts, then the page's declared tables. */
export interface DocumentedGrammarReport {
  readonly documented: readonly string[];
  readonly categories: readonly string[];
  readonly gaps: readonly GapRow[];
  readonly overclaims: readonly OverclaimRow[];
  readonly tables: readonly ReportTable[];
}

const BOUNDARIES: readonly string[] = [".", "["];
const NO_MATCH = -1;
const NO_ENTRIES = "—";

const startsAtBoundary = (path: string, prefix: string): boolean =>
  path === prefix || BOUNDARIES.some((boundary) => path.startsWith(`${prefix}${boundary}`));

/** An exact entry beats any prefix; otherwise the longest owning prefix wins. */
const scoreOf = (area: GrammarArea, path: string): number => {
  if (area.exact?.includes(path) === true) {
    return Number.MAX_SAFE_INTEGER;
  }

  return area.prefixes.reduce(
    (best, prefix) => (startsAtBoundary(path, prefix) ? Math.max(best, prefix.length) : best),
    NO_MATCH,
  );
};

const areaFor = (areas: readonly GrammarArea[], path: string): string | undefined => {
  let best = NO_MATCH;
  let winner: string | undefined;

  for (const area of areas) {
    const score = scoreOf(area, path);

    if (score < 0) {
      continue;
    }

    if (score > best) {
      best = score;
      winner = area.name;
    } else if (score === best && winner !== area.name) {
      throw new Error(`${path} matches both ${winner} and ${area.name} equally`);
    }
  }

  return winner;
};

const areaOrThrow = (areas: readonly GrammarArea[], path: string): string => {
  const area = areaFor(areas, path);

  if (area === undefined) {
    throw new Error(`${path} is modelled but belongs to no grammar area`);
  }

  return area;
};

const checkCorpusKnown = (
  report: CoverageReport,
  ledgerPathOf: (path: string) => string,
): ReadonlySet<string> => {
  const known = new Set([...report.modelled, ...report.ledger.map((path) => ledgerPathOf(path))]);

  for (const entry of report.corpus) {
    for (const path of entry.paths) {
      if (!known.has(path)) {
        throw new Error(`${entry.name} uses ${path}, which is neither modelled nor declared`);
      }
    }
  }

  return new Set(report.modelled);
};

const entriesFor = (
  area: string,
  report: CoverageReport,
  modelled: ReadonlySet<string>,
): readonly string[] =>
  report.corpus.flatMap((entry) =>
    entry.paths.some((path) => modelled.has(path) && areaFor(report.areas, path) === area)
      ? [entry.name]
      : [],
  );

/** Column padding matches the markdown formatter, so `pnpm fmt` does not rewrite the block. */
export const formatTable = (header: readonly string[], rows: readonly ReportRow[]): string => {
  const all = [header, ...rows];

  const widths = header.map((_, column) =>
    Math.max(...all.map((row) => (row[column] ?? "").length)),
  );

  const line = (row: ReportRow): string =>
    `| ${row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join(" | ")} |`;

  const separator = `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`;

  return [line(header), separator, ...rows.map((row) => line(row))].join("\n");
};

/**
 * The document's coverage table: one row per grammar area, naming the keys it owns and the corpus
 * entries that exercise it. Throws on a modelled path in no area or in two equally, and on a corpus
 * path that is neither modelled nor declared.
 */
export const renderCoverageTable = (report: CoverageReport): string => {
  const keyOf = report.keyOf ?? ((path: string): string => path);
  const ledgerPathOf = report.ledgerPathOf ?? ((path: string): string => path);
  const modelledSet = checkCorpusKnown(report, ledgerPathOf);

  const positions = new Map<string, number>();

  for (const path of report.modelled) {
    const key = keyOf(path);

    positions.set(key, (positions.get(key) ?? 0) + 1);
  }

  const keys = [...positions.keys()].toSorted();
  const areasOfKeys = new Map(keys.map((key) => [key, areaOrThrow(report.areas, key)]));

  const rows = report.areas.map((area) => {
    const owned = keys.filter((key) => areasOfKeys.get(key) === area.name);

    const cell = owned
      .map((key) => {
        const count = positions.get(key) ?? 0;

        const note =
          count > 1 && report.positionsNote !== undefined ? report.positionsNote(count) : "";

        return `\`${key}\`${note}`;
      })
      .join("<br>");

    const entries = entriesFor(area.name, report, modelledSet);

    return [
      area.name,
      cell === "" ? report.emptyCell : cell,
      entries.length === 0 ? NO_ENTRIES : entries.join(", "),
    ];
  });

  const table = formatTable(report.header, rows);

  return report.lead === undefined
    ? table
    : `${report.lead(report.modelled.length, keys.length)}\n\n${table}`;
};

/** The open-gaps section: the ledger, or a sentence saying there is none. */
export const renderOpenGaps = (ledger: readonly LedgerRow[]): string =>
  ledger.length === 0
    ? "None. The coverage ledger is empty: every corpus key is modelled."
    : ledger.map((row) => `- \`${row.path}\` — ${row.reason}`).join("\n");

const byPath = (left: { readonly path: string }, right: { readonly path: string }): number => {
  if (left.path === right.path) {
    return 0;
  }

  return left.path < right.path ? -1 : 1;
};

/** Gap rows in the gap table's column order: what, how bad, why. */
export const gapRows = (gaps: readonly GapRow[]): readonly ReportRow[] =>
  gaps.toSorted(byPath).map((gap) => [`\`${gap.path}\``, `\`${gap.category}\``, gap.reason]);

/** Rows that carry a path and a reason, sorted by path so two runs render the same table. */
export const pathReasonRows = (
  rows: readonly { readonly path: string; readonly reason: string }[],
): readonly ReportRow[] => rows.toSorted(byPath).map((row) => [`\`${row.path}\``, row.reason]);

const perCategory = (categories: readonly string[], gaps: readonly GapRow[]): string =>
  categories
    .map(
      (category) => `${category} ${String(gaps.filter((gap) => gap.category === category).length)}`,
    )
    .join(", ");

/**
 * The document's documented-grammar block: the counts, then each declared table under its own
 * heading. `documented` is the walker's path set, so the count follows the pinned schema rather
 * than prose, and the page decides how its gaps are laid out.
 */
export const renderDocumentedGrammar = (report: DocumentedGrammarReport): string => {
  const counts = [
    `${String(report.documented.length)} documented paths.`,
    `Gaps: ${String(report.gaps.length)} (${perCategory(report.categories, report.gaps)}).`,
    `Overclaims: ${String(report.overclaims.length)}.`,
  ].join(" ");

  const tables = report.tables.flatMap((table) => [
    ...(table.heading === undefined ? [] : [table.heading]),
    formatTable(
      table.header,
      table.rows.length === 0 && table.emptyRow !== undefined ? [table.emptyRow] : table.rows,
    ),
  ]);

  return [counts, ...tables].join("\n\n");
};

/** The text between a pair of marker comments, without the markers themselves. */
export const blockIn = (text: string, name: string): string => {
  const match = new RegExp(
    `<!-- ${name}:start -->\\n([\\s\\S]*?)\\n<!-- ${name}:end -->`,
    "u",
  ).exec(text);

  if (match === null || match[1] === undefined) {
    throw new Error(`no ${name} block in the document`);
  }

  return match[1].trim();
};

/** The counts a block's lead states, read back so they can be held to the lists. */
export const countsIn = (block: string): readonly number[] => {
  const lead = block.split("\n")[0] ?? "";

  return [...lead.matchAll(/\d+/gu)].map((match) => Number(match[0]));
};
