import type { CoverageDebt } from "./coverage-debt.js";
import { translateLedgerPath } from "./exhaustiveness.js";

/** One grammar area: the paths it owns, named exactly or by owning a subtree. */
interface GrammarArea {
  readonly name: string;
  readonly exact: readonly string[];
  readonly prefixes: readonly string[];
}

/** The key paths one corpus entry uses, already normalised by the gate's walk. */
export interface CorpusPaths {
  readonly name: string;
  readonly paths: readonly string[];
}

/**
 * The grouping the document presents. `exact` lists leaves whose siblings belong somewhere else;
 * `prefixes` owns a subtree, including the key itself and every path below it. Every modelled path
 * must land in exactly one area, or the generator throws rather than dropping it from the table.
 */
const GRAMMAR_AREAS: readonly GrammarArea[] = [
  {
    name: "Workflow identity",
    exact: ["$.name", '$["run-name"]'],
    prefixes: [],
  },
  {
    name: "Triggers",
    exact: [],
    prefixes: ["$.on"],
  },
  {
    name: "Permissions",
    exact: [],
    prefixes: ["$.permissions", "$.jobs.*.permissions"],
  },
  {
    name: "Workflow env",
    exact: [],
    prefixes: ["$.env"],
  },
  {
    name: "Workflow defaults",
    exact: [],
    prefixes: ["$.defaults"],
  },
  {
    name: "Concurrency",
    exact: [],
    prefixes: ["$.concurrency", "$.jobs.*.concurrency"],
  },
  {
    name: "Job body",
    exact: [
      "$.jobs",
      "$.jobs.*",
      "$.jobs.*.if",
      "$.jobs.*.name",
      "$.jobs.*.needs",
      "$.jobs.*.needs[]",
      "$.jobs.*.outputs",
      "$.jobs.*.outputs.*",
      '$.jobs.*["continue-on-error"]',
      '$.jobs.*["runs-on"]',
      '$.jobs.*["runs-on"][]',
      '$.jobs.*["timeout-minutes"]',
    ],
    prefixes: [],
  },
  {
    name: "Reusable-workflow calls",
    exact: ["$.jobs.*.uses"],
    prefixes: ["$.jobs.*.with", "$.jobs.*.secrets"],
  },
  {
    name: "Environment",
    exact: [],
    prefixes: ["$.jobs.*.environment"],
  },
  {
    name: "Strategy and matrix",
    exact: [],
    prefixes: ["$.jobs.*.strategy"],
  },
  {
    name: "Steps",
    exact: [],
    prefixes: ["$.jobs.*.steps"],
  },
  {
    name: "Containers",
    exact: [],
    prefixes: ["$.jobs.*.container"],
  },
  {
    name: "Services",
    exact: [],
    prefixes: ["$.jobs.*.services"],
  },
  {
    name: "Job env",
    exact: [],
    prefixes: ["$.jobs.*.env"],
  },
  {
    name: "Job defaults",
    exact: [],
    prefixes: ["$.jobs.*.defaults"],
  },
];

const BOUNDARIES: readonly string[] = [".", "["];
const NO_MATCH = -1;

const startsAtBoundary = (path: string, prefix: string): boolean =>
  path === prefix || BOUNDARIES.some((boundary) => path.startsWith(`${prefix}${boundary}`));

/** An exact entry beats any prefix; otherwise the longest owning prefix wins. */
const scoreOf = (area: GrammarArea, path: string): number => {
  if (area.exact.includes(path)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return area.prefixes.reduce(
    (best, prefix) => (startsAtBoundary(path, prefix) ? Math.max(best, prefix.length) : best),
    NO_MATCH,
  );
};

const areaFor = (path: string): string | undefined => {
  let best = NO_MATCH;
  let winner: string | undefined;

  for (const area of GRAMMAR_AREAS) {
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

const byArea = (modelled: readonly string[]): ReadonlyMap<string, readonly string[]> => {
  const groups = new Map<string, string[]>();

  for (const path of modelled) {
    const area = areaFor(path);

    if (area === undefined) {
      throw new Error(`${path} is modelled but belongs to no grammar area`);
    }

    groups.set(area, [...(groups.get(area) ?? []), path]);
  }

  return groups;
};

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

const TABLE_HEADER: readonly string[] = ["Area", "Modelled paths", "Corpus entries"];

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
 * The document's coverage table: one row per grammar area, naming the modelled paths it owns and the
 * corpus entries that exercise it. Throws on a modelled path in no area and on a corpus path that is
 * neither modelled nor declared, so the table cannot silently shrink.
 */
export const renderCoverageTable = (
  modelled: readonly string[],
  corpus: readonly CorpusPaths[],
  ledger: readonly string[],
): string => {
  const modelledSet = checkCorpusKnown(corpus, modelled, ledger);
  const groups = byArea(modelled);

  const rows = GRAMMAR_AREAS.map((area) => {
    const paths = (groups.get(area.name) ?? []).toSorted();
    const entries = entriesFor(area.name, corpus, modelledSet);
    const cells = paths.map((path) => `\`${path}\``).join("<br>");

    return [area.name, cells, entries.length === 0 ? "—" : entries.join(", ")];
  });

  return formatTable(TABLE_HEADER, rows);
};

/** The open-gaps section: the ledger, or a sentence saying there is none. */
export const renderOpenGaps = (ledger: readonly CoverageDebt[]): string =>
  ledger.length === 0
    ? "None. The coverage ledger is empty: every corpus key is modelled."
    : ledger.map((row) => `- \`${row.path}\` — ${row.reason}`).join("\n");
