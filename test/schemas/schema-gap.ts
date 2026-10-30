/**
 * The provider-neutral half of the documented-grammar gate: four set differences over the schema
 * walk and the modelled inventory, plus the failure text. Each provider supplies its own paths and
 * declared rows, so the rules are stated once and no provider can weaken them by accident.
 */

/** Any row that names a path, so the diff helpers read both lists without a second shape. */
export interface PathRow {
  readonly path: string;
}

const unique = (paths: readonly string[]): readonly string[] => [...new Set(paths)].toSorted();

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

/**
 * GAPS rows whose path the vocabulary now models. Modelling a keyword closes its row, and a row that
 * outlives its keyword keeps reporting debt that is already paid; the row must go, or be narrowed to
 * the children the schema still allows and the vocabulary does not.
 */
export const staleGapPaths = (
  modelled: readonly string[],
  gaps: readonly PathRow[],
): readonly string[] => {
  const modelledSet = new Set(modelled);

  return unique(gaps.flatMap((gap) => (modelledSet.has(gap.path) ? [gap.path] : [])));
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

/** The failure text for a stale row: the debt is paid, so the row narrows or leaves. */
export const staleGapRemedies = (path: string): string =>
  `${path} is modelled now, so its GAPS row is stale: delete the row, or replace it with the child paths that are still missing`;
