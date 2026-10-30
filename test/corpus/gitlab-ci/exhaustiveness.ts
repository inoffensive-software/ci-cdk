import { parse } from "yaml";

import { type Pipeline, render } from "@inoffensive/ci-cdk/gitlab-ci";
import { GLOBAL_KEYWORDS } from "../../../src/gitlab-ci/validate.js";
import { keyPath, walkPaths, type YamlNode } from "../paths.js";
import { INVENTORY } from "./inventory.js";

/** The document root's first key segment, dotted for an identifier and quoted for anything else. */
const ROOT_SEGMENT = /^\$(?:\.([A-Za-z_$][\w$]*)|\[("(?:[^"\\]|\\.)*")\])/u;

/**
 * A hidden key is author data, whether it arrived through `templates` or the corpus's own text, and a
 * `templates` key is always quoted by `keyPath` because `.` cannot start an identifier.
 */
const isHidden = (path: string): boolean => path.startsWith('$[".');

/**
 * GitLab's document root mixes pipeline keywords with job names, so the root is where names have to
 * be normalised: a keyword stays literal, and anything else is a job the author named, which becomes
 * `*`. Children below the root need no normalisation, because every modelled level there is a fixed
 * keyword or an author map a ledger row owns whole.
 */
const normaliseRoot = (path: string): string | undefined => {
  const match = ROOT_SEGMENT.exec(path);

  if (match === null) {
    return path;
  }

  const [segment] = match;

  if (isHidden(segment)) {
    return undefined;
  }

  // A quoted segment can never name a keyword: every keyword is an identifier, and identifiers are dotted.
  return GLOBAL_KEYWORDS.includes(segment.slice(2)) ? path : `$.*${path.slice(segment.length)}`;
};

/**
 * Every key path in a YAML document, with job names, sequence positions and hidden templates
 * normalised. The input is text, so the parse result crosses the boundary once here and is never
 * seen as untyped data again.
 */
export const keyPaths = (text: string): readonly string[] => {
  const document: YamlNode = parse(text);

  return [
    ...new Set(walkPaths(document, []).flatMap((path) => normaliseRoot(path) ?? [])),
  ].toSorted();
};

/** The modelled set: the union of the inventory documents' paths, rendered exactly as a consumer's. */
export const inventoryPaths = (): readonly string[] => {
  const paths = new Set<string>();

  for (const document of INVENTORY) {
    for (const path of keyPaths(render(document.pipeline, { header: "" }))) {
      paths.add(path);
    }
  }

  return [...paths].toSorted();
};

/**
 * Every key a fixture wrote through `raw`, named where the author wrote it, so the ledger and this
 * walk agree on notation.
 */
export const rawPathsOf = (pipeline: Pipeline): readonly string[] => {
  const paths: string[] = Object.keys(pipeline.raw ?? {}).map((key) => keyPath("$.raw", key));

  for (const [index, job] of pipeline.jobs.entries()) {
    paths.push(...Object.keys(job.raw ?? {}).map((key) => keyPath(`$.jobs[${index}].raw`, key)));
  }

  return paths.toSorted();
};

const LEDGER_JOB = /^\$\.jobs\[\d+\]\.raw/u;
const LEDGER_PIPELINE = /^\$\.raw/u;

/** A ledger path is written where the author put `raw`; the gate compares modelled positions. */
export const translateLedgerPath = (path: string): string =>
  path.replace(LEDGER_JOB, "$.*").replace(LEDGER_PIPELINE, "$");

/** Sorted and de-duplicated, because two jobs reaching for the same missing key are one gap. */
const unique = (paths: readonly string[]): readonly string[] => [...new Set(paths)].toSorted();

/**
 * A raw entry owns everything under it, so a declared row explains its whole subtree. The segment
 * boundary matters: `$.variables` must not explain `$.variables_extra`.
 */
const explains = (declared: string, path: string): boolean =>
  path === declared || path.startsWith(`${declared}.`) || path.startsWith(`${declared}[`);

const declaredPaths = (declared: readonly string[]): readonly string[] =>
  declared.flatMap((row) => {
    const path = translateLedgerPath(row);

    return isHidden(path) ? [] : [path];
  });

/** Corpus paths the vocabulary cannot emit and the fixture does not declare through `raw`. */
export const gapPaths = (
  corpus: readonly string[],
  modelled: readonly string[],
  declared: readonly string[],
): readonly string[] => {
  const rows = declaredPaths(declared);
  const known = new Set([...modelled, ...rows]);

  return unique(
    corpus.filter(
      (path) => !isHidden(path) && !known.has(path) && !rows.some((row) => explains(row, path)),
    ),
  );
};

/** Declared gaps the corpus does not need, which would let a row rot without failing. */
export const unusedLedgerPaths = (
  corpus: readonly string[],
  declared: readonly string[],
): readonly string[] =>
  unique(
    declared.flatMap((row) => {
      const modelled = translateLedgerPath(row);

      if (isHidden(modelled) || corpus.some((path) => explains(modelled, path))) {
        return [];
      }

      return [modelled];
    }),
  );

/** `raw` that stands in for a key the inventory already models; the gate treats this as a failure. */
export const filledRawPaths = (
  pipeline: Pipeline,
  modelled: readonly string[],
): readonly string[] => {
  const known = new Set(modelled);

  return unique(
    rawPathsOf(pipeline).flatMap((row) => {
      const path = translateLedgerPath(row);

      return !isHidden(path) && known.has(path) ? [path] : [];
    }),
  );
};

/** The failure text a reader needs: the path, and both ways to make it legal. */
export const remediesFor = (path: string): string =>
  `${path} is not modelled; model it in the vocabulary, or express it through raw and declare it in the ledger`;
