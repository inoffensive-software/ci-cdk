import { readFileSync } from "node:fs";

import { render } from "../../../src/github-actions/index.js";
import { schemaFromText, walkSchema } from "../../schemas/walk.js";
import { inventoryPaths } from "../gate.js";
import { AUTHOR_NAMED, keyPaths } from "./exhaustiveness.js";
import { INVENTORY } from "./inventory.js";

export { GAPS, GAP_CATEGORIES, OVERCLAIMS } from "./schema-gap-debt.js";

export type { Gap, GapCategory, Overclaim } from "./schema-gap-debt.js";

/** Any row that names a path, so the diff helpers read both lists without a second shape. */
interface PathRow {
  readonly path: string;
}

const unique = (paths: readonly string[]): readonly string[] => [...new Set(paths)].toSorted();

/**
 * The documented grammar: every key path the vendored schema allows from its root, normalised by the
 * same author-named list the exhaustiveness gate uses so the two sets are comparable.
 */
export const SCHEMA_PATHS: readonly string[] = walkSchema(
  schemaFromText(
    readFileSync(new URL("../../schemas/github-actions.json", import.meta.url), "utf8"),
  ),
  AUTHOR_NAMED,
);

/** The modelled set, derived exactly as the exhaustiveness gate derives it. */
export const MODELLED_PATHS: readonly string[] = inventoryPaths({
  fixtures: INVENTORY,
  renderOf: (document) => render(document.workflow, { header: "" }),
  keyPaths,
});

/** Schema paths neither the inventory models nor a GAPS row declares. */
export const undeclaredSchemaPaths = (
  schema: readonly string[],
  modelled: readonly string[],
  gaps: readonly PathRow[],
): readonly string[] => {
  const known = new Set([...modelled, ...gaps.map((gap) => gap.path)]);

  return unique(schema.filter((path) => !known.has(path)));
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
