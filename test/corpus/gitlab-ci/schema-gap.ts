import { readFileSync } from "node:fs";

import { schemaFromText, walkSchema } from "../../schemas/walk.js";
import { AUTHOR_NAMED, inventoryPaths } from "./exhaustiveness.js";

export { GAPS, GAP_CATEGORIES, OVERCLAIMS } from "./schema-gap-debt.js";

export type { Gap, GapCategory, Overclaim } from "./schema-gap-debt.js";

/** Any row that names a path, so the diff helpers read both lists without a second shape. */
interface PathRow {
  readonly path: string;
}

const unique = (paths: readonly string[]): readonly string[] => [...new Set(paths)].toSorted();

/**
 * GitLab's root mixes pipeline keywords with job names. The schema states the rule itself: every
 * keyword is a named property, and `additionalProperties` carries `job`, so a named key stays literal
 * and any other key becomes `$.*`. Hidden templates are a `patternProperties` branch at the same
 * root, which is the same wildcard, so they can neither add a path nor hide one. The author-named
 * list is the gate's own, so a scalar map's keys compare as one position on both sides.
 */

/**
 * The documented grammar: every key path the vendored schema allows from its root, normalised by the
 * walker's author-named rule so the two sets are comparable.
 */
export const SCHEMA_PATHS: readonly string[] = walkSchema(
  schemaFromText(readFileSync(new URL("../../schemas/gitlab-ci.json", import.meta.url), "utf8")),
  AUTHOR_NAMED,
);

/** The modelled set, derived exactly as the exhaustiveness gate derives it. */
export const MODELLED_PATHS: readonly string[] = inventoryPaths();

/**
 * A GAPS row declares its whole subtree: a row names the keyword the vocabulary is missing, so every
 * path below it is debt that keyword already accounts for. The report therefore grows by keyword, not
 * by leaf, and modelling one keyword reveals the next layer on the next run. A path is declared when
 * a row names it, or names a dotted child (`path.`), or a sequence under it (`path[`).
 */
export const undeclaredSchemaPaths = (
  schema: readonly string[],
  modelled: readonly string[],
  gaps: readonly PathRow[],
): readonly string[] => {
  const modelledSet = new Set(modelled);
  const gapPaths = gaps.map((gap) => gap.path);

  const isDeclared = (path: string): boolean =>
    modelledSet.has(path) ||
    gapPaths.some(
      (gap) => path === gap || path.startsWith(`${gap}.`) || path.startsWith(`${gap}[`),
    );

  return unique(schema.filter((path) => !isDeclared(path)));
};

/** GAPS rows that name no schema path, so a row cannot outlive the schema entry it describes. */
export const orphanedGapPaths = (
  schema: readonly string[],
  gaps: readonly PathRow[],
): readonly string[] => {
  const known = new Set(schema);

  return unique(gaps.flatMap((gap) => (known.has(gap.path) ? [] : [gap.path])));
};

/** Modelled paths the schema lacks and OVERCLAIMS does not declare. */
export const undeclaredOverclaimPaths = (
  schema: readonly string[],
  modelled: readonly string[],
  overclaims: readonly PathRow[],
): readonly string[] => {
  const allowed = new Set(schema);
  const declared = new Set(overclaims.map((overclaim) => overclaim.path));

  return unique(modelled.filter((path) => !allowed.has(path) && !declared.has(path)));
};

/** OVERCLAIMS rows that name no modelled path, or a path the schema already allows. */
export const unusedOverclaimPaths = (
  schema: readonly string[],
  modelled: readonly string[],
  overclaims: readonly PathRow[],
): readonly string[] => {
  const allowed = new Set(schema);
  const modelledSet = new Set(modelled);

  return unique(
    overclaims.flatMap((overclaim) =>
      !modelledSet.has(overclaim.path) || allowed.has(overclaim.path) ? [overclaim.path] : [],
    ),
  );
};

/** The failure text a reader needs: the path, and both ways to make it legal. */
export const gapRemedies = (path: string): string =>
  `${path} is neither modelled nor declared; model it in the vocabulary, or add a row to GAPS`;
