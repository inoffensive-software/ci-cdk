import type { CoverageDebt } from "./coverage-debt.js";
import { translateLedgerPath } from "./exhaustiveness.js";

/** One grammar area: the paths it owns, named by the subtree that contains them. */
interface GrammarArea {
  readonly name: string;
  readonly prefixes: readonly string[];
}

/** The key paths one corpus entry uses, already normalised by the gate's walk. */
export interface CorpusPaths {
  readonly name: string;
  readonly paths: readonly string[];
}

/**
 * The grouping the document presents. The three areas are the document's own sections: what one
 * pipeline file declares once, the reusable definitions, and the pipeline sections that repeat the
 * item grammar. Every modelled path must land in exactly one area, or the generator throws rather
 * than dropping it from the table.
 */
const GRAMMAR_AREAS: readonly GrammarArea[] = [
  {
    name: "Document",
    prefixes: ["$.image", "$.clone", "$.options"],
  },
  {
    name: "Definitions",
    prefixes: ["$.definitions"],
  },
  {
    name: "Pipelines",
    prefixes: ["$.pipelines"],
  },
];

/**
 * Every pipeline section repeats the same item grammar, so a key is displayed once per shape rather
 * than once per position. A section prefix is replaced by `$.pipelines.*`, which keeps the trailing
 * sequence marker the path already carries.
 */
const SECTION_PREFIXES: readonly string[] = [
  "$.pipelines.default",
  "$.pipelines.branches.*",
  "$.pipelines.tags.*",
  '$.pipelines["pull-requests"].*',
  "$.pipelines.custom.*",
];

/** An item wrapper carries no grammar of its own, so it displays as `.item` at every position. */
const ITEM_WRAPPERS: readonly string[] = [
  ".stage.steps[].step",
  ".parallel.steps[].step",
  ".parallel[].step",
  ".final",
  ".step",
];

const BOUNDARIES: readonly string[] = [".", "["];
const NO_MATCH = -1;

const startsAtBoundary = (path: string, prefix: string): boolean =>
  path === prefix || BOUNDARIES.some((boundary) => path.startsWith(`${prefix}${boundary}`));

/** An exact path is owned by the longest prefix that contains it; ties are a bug in the table. */
const areaFor = (path: string): string | undefined => {
  let best = NO_MATCH;
  let winner: string | undefined;

  for (const area of GRAMMAR_AREAS) {
    const score = area.prefixes.reduce(
      (longest, prefix) =>
        startsAtBoundary(path, prefix) ? Math.max(longest, prefix.length) : longest,
      NO_MATCH,
    );

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

const escapeForRegExp = (text: string): string => text.replaceAll(/[.*+?^${}()|[\]\\]/gu, "\\$&");

/**
 * The display form of a key path: a pipeline section becomes `$.pipelines.*`, and every item wrapper
 * below it becomes `.item`. Nothing else changes, so a path outside the repeated positions keeps its
 * exact spelling. Collapsing is display only; the inventory itself still holds every position.
 */
export const collapsePosition = (path: string): string => {
  const section = SECTION_PREFIXES.find(
    (prefix) => path === prefix || path.startsWith(`${prefix}.`) || path.startsWith(`${prefix}[`),
  );

  const collapsed = section === undefined ? path : `$.pipelines.*${path.slice(section.length)}`;

  return ITEM_WRAPPERS.reduce(
    (current, wrapper) =>
      current.replaceAll(new RegExp(`${escapeForRegExp(wrapper)}(?=\\.|\\[|$)`, "gu"), ".item"),
    collapsed,
  );
};

/** The distinct display keys of the modelled set, sorted, with every path held to one area. */
export const displayKeysOf = (modelled: readonly string[]): readonly string[] =>
  [
    ...new Set(
      modelled.map((path) => {
        if (areaFor(path) === undefined) {
          throw new Error(`${path} is modelled but belongs to no grammar area`);
        }

        return collapsePosition(path);
      }),
    ),
  ].toSorted();

const checkCorpusKnown = (
  corpus: readonly CorpusPaths[],
  modelled: readonly string[],
  ledger: readonly string[],
): ReadonlySet<string> => {
  const known = new Set([...modelled, ...ledger.map((path) => translateLedgerPath(path))]);

  for (const entry of corpus) {
    for (const path of entry.paths) {
      if (!known.has(path)) {
        throw new Error(`${entry.name} uses ${path}, which is neither modelled nor declared`);
      }
    }
  }

  return new Set(modelled);
};

const entriesFor = (
  area: string,
  corpus: readonly CorpusPaths[],
  modelled: ReadonlySet<string>,
): readonly string[] =>
  corpus.flatMap((entry) =>
    entry.paths.some((path) => modelled.has(path) && areaFor(path) === area) ? [entry.name] : [],
  );

const TABLE_HEADER: readonly string[] = ["Area", "Keys", "Corpus entries"];

/** Column padding matches the markdown formatter, so `pnpm fmt` does not rewrite the block. */
export const formatTable = (
  header: readonly string[],
  rows: readonly (readonly string[])[],
): string => {
  const all = [header, ...rows];

  const widths = header.map((_, column) =>
    Math.max(...all.map((row) => (row[column] ?? "").length)),
  );

  const line = (row: readonly string[]): string =>
    `| ${row.map((cell, column) => cell.padEnd(widths[column] ?? 0)).join(" | ")} |`;

  const separator = `| ${widths.map((width) => "-".repeat(width)).join(" | ")} |`;

  return [line(header), separator, ...rows.map((row) => line(row))].join("\n");
};

/**
 * The document's coverage table: one row per grammar area, naming the display keys it owns and the
 * corpus entries that exercise it. A key used at more than one position is annotated with the count,
 * so a collapsed row still says how much grammar it stands for. Throws on a modelled path in no area
 * and on a corpus path that is neither modelled nor declared, so the table cannot silently shrink.
 */
export const renderCoverageTable = (
  modelled: readonly string[],
  corpus: readonly CorpusPaths[],
  ledger: readonly string[],
): string => {
  const modelledSet = checkCorpusKnown(corpus, modelled, ledger);
  const keys = displayKeysOf(modelled);

  const keyCounts = new Map<string, number>();

  for (const path of modelled) {
    const key = collapsePosition(path);
    keyCounts.set(key, (keyCounts.get(key) ?? 0) + 1);
  }

  const rows = GRAMMAR_AREAS.map((area) => {
    const owned = keys.filter((key) => areaFor(key) === area.name);

    const cell = owned
      .map((key) => {
        const count = keyCounts.get(key) ?? 0;

        return count > 1 ? `\`${key}\` (x${String(count)})` : `\`${key}\``;
      })
      .join("<br>");

    const entries = entriesFor(area.name, corpus, modelledSet);

    return [area.name, cell === "" ? "—" : cell, entries.length === 0 ? "—" : entries.join(", ")];
  });

  const lead = `${String(modelled.length)} modelled paths collapse to ${String(keys.length)} display keys.`;

  return `${lead}\n\n${formatTable(TABLE_HEADER, rows)}`;
};

/** The open-gaps section: the ledger, or a sentence saying there is none. */
export const renderOpenGaps = (ledger: readonly CoverageDebt[]): string =>
  ledger.length === 0
    ? "None. The coverage ledger is empty: every corpus key is modelled."
    : ledger.map((row) => `- \`${row.path}\` — ${row.reason}`).join("\n");
