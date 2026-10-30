import { parse } from "yaml";

import { type Pipeline } from "@inoffensive/ci-cdk/gitlab-ci";
import { GLOBAL_KEYWORDS } from "../../../src/gitlab-ci/validate.js";
import { coversSubtree, type LedgerRules } from "../gate.js";
import { keyPath, walkPaths, type YamlNode } from "../paths.js";

/** The document root's first key segment, dotted for an identifier and quoted for anything else. */
const ROOT_SEGMENT = /^\$(?:\.([A-Za-z_$][\w$]*)|\[("(?:[^"\\]|\\.)*")\])/u;

/**
 * Map keys that belong to the author, not to GitLab: a scalar map's keys are names the caller chose,
 * so two names at the same position are the same grammar and both normalise to `*`.
 *
 * The list is written in the gate's notation, after the root has been normalised, so `$.variables`
 * is the pipeline map and `$.*.variables` is any job's. The schema walk reads the same list directly,
 * because a schema path is already in that notation.
 */
export const AUTHOR_NAMED: readonly string[] = [
  "$.variables",
  "$.*.variables",
  "$.default.services[].variables",
  "$.*.services[].variables",
  "$.include[].inputs",
  "$.*.trigger.inputs",
  "$.*.trigger.include[].inputs",
  "$.workflow.rules[].variables",
  "$.*.rules[].variables",
  "$.*.needs[].parallel.matrix[]",
  "$.*.parallel.matrix[]",
  "$.*.artifacts.reports",
];

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

/** The path without its final key segment, so an author-named map can be recognised by its parent. */
const parentPath = (path: string): string => {
  const cut = Math.max(path.lastIndexOf("."), path.lastIndexOf("["));

  return cut <= 0 ? path : path.slice(0, cut);
};

/**
 * A key below an author-named path is a name the caller chose, so it becomes `*`; a suffix of
 * sequence markers after it stays, because a cell may hold a list. This runs after the root is
 * normalised, because a job's body is only reachable at `$.*` once its name is.
 */
const normaliseAuthor = (path: string): string => {
  for (const name of AUTHOR_NAMED) {
    const prefix = `${name}.`;

    if (!path.startsWith(prefix)) {
      continue;
    }

    const rest = path.slice(prefix.length);
    const marker = rest.indexOf("[");

    return marker === -1 ? `${name}.*` : `${name}.*${rest.slice(marker)}`;
  }

  const parent = parentPath(path);

  return AUTHOR_NAMED.includes(parent) ? `${parent}.*` : path;
};

/**
 * Every key path in a YAML document, with job names, sequence positions, hidden templates and
 * author-chosen map keys normalised. The input is text, so the parse result crosses the boundary once
 * here and is never seen as untyped data again.
 */
export const keyPaths = (text: string): readonly string[] => {
  const document: YamlNode = parse(text);

  return [
    ...new Set(
      walkPaths(document, [])
        .flatMap((path) => normaliseRoot(path) ?? [])
        .map((path) => normaliseAuthor(path)),
    ),
  ].toSorted();
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
const translateLedgerPath = (path: string): string =>
  path.replace(LEDGER_JOB, "$.*").replace(LEDGER_PIPELINE, "$");

/**
 * A `raw` entry owns everything under it, and a hidden key is author data on both sides, so one row
 * explains a whole map and the corpus never reports an author's own keys.
 */
export const LEDGER_RULES: LedgerRules = {
  translate: translateLedgerPath,
  covers: coversSubtree,
  isAuthorData: isHidden,
};
