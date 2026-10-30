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
 * A row declares its whole subtree: a row names a keyword, so every path below it is debt that
 * keyword already accounts for. A path is declared when a row names it, or names a dotted child
 * (`path.`), or a sequence under it (`path[`); a partial segment never counts.
 *
 * Both lists use this rule. On GAPS it grows the report by keyword rather than leaf, so modelling one
 * keyword reveals the next layer on the next run. On OVERCLAIMS it lets one row stand for a shape the
 * schema omits wholesale, such as a definition the document references everywhere.
 */
export const subsumes = (row: string, path: string): boolean =>
  path === row || path.startsWith(`${row}.`) || path.startsWith(`${row}[`);

/** Schema paths neither modelled nor declared by a GAPS row. */
export const undeclaredSchemaPaths = (
  schema: readonly string[],
  modelled: readonly string[],
  gaps: readonly PathRow[],
): readonly string[] => {
  const modelledSet = new Set(modelled);
  const gapPaths = gaps.map((gap) => gap.path);

  const isDeclared = (path: string): boolean =>
    modelledSet.has(path) || gapPaths.some((gap) => subsumes(gap, path));

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

/** Modelled paths the schema lacks and no OVERCLAIMS row declares. */
export const undeclaredOverclaimPaths = (
  schema: readonly string[],
  modelled: readonly string[],
  overclaims: readonly PathRow[],
): readonly string[] => {
  const allowed = new Set(schema);
  const declared = overclaims.map((overclaim) => overclaim.path);

  return unique(
    modelled.filter((path) => !allowed.has(path) && !declared.some((row) => subsumes(row, path))),
  );
};

/** OVERCLAIMS rows that declare no modelled path the schema lacks. */
export const unusedOverclaimPaths = (
  schema: readonly string[],
  modelled: readonly string[],
  overclaims: readonly PathRow[],
): readonly string[] => {
  const allowed = new Set(schema);

  return unique(
    overclaims.flatMap((overclaim) =>
      modelled.some((path) => subsumes(overclaim.path, path) && !allowed.has(path))
        ? []
        : [overclaim.path],
    ),
  );
};

/** The failure text a reader needs: the path, and both ways to make it legal. */
export const gapRemedies = (path: string): string =>
  `${path} is neither modelled nor declared; model it in the vocabulary, or add a row to GAPS`;

/** The failure text for a stale row: the debt is paid, so the row narrows or leaves. */
export const staleGapRemedies = (path: string): string =>
  `${path} is modelled now, so its GAPS row is stale: delete the row, or replace it with the child paths that are still missing`;
