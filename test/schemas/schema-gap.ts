/**
 * The provider-neutral half of the documented-grammar gate: four set differences over the schema
 * walk and the modelled inventory, the failure text, and the assertions a provider runs over them.
 * Each provider supplies its own paths and declared rows, so the rules are stated once and no
 * provider can weaken them by accident.
 */

import { describe, expect, it } from "vitest";

import { GAP_CATEGORIES, type Gap, type GapCategory, type Overclaim } from "./gap-debt.js";

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

/** The only categories a gap may carry; a row outside this list has no report to belong to. */
const CLOSED_CATEGORIES: readonly GapCategory[] = GAP_CATEGORIES;

/** The rows that sit out of order or repeat, so a failure names the entry to move or delete. */
const outOfOrder = (paths: readonly string[]): readonly string[] => {
  const wanted = unique(paths);

  return paths.filter((path, index) => wanted[index] !== path);
};

/** A message per offending row, so the assertion diff names every path to move or delete. */
const offenders = (paths: readonly string[]): readonly string[] =>
  paths.map((path) => `offending path: ${path}`);

/** A message per offending row, with the prose that says how to make it legal. */
const remedies = (paths: readonly string[], remedy: (path: string) => string): readonly string[] =>
  paths.map((path) => remedy(path));

/** The four values only a provider knows: its schema walk, its inventory, its gaps and overclaims. */
export interface SchemaGapGateOptions {
  /** Every key path the provider's vendored schema allows from its root. */
  readonly schemaPaths: readonly string[];
  /** Every key path the provider's inventory can emit. */
  readonly modelledPaths: readonly string[];
  /** Documented grammar the provider cannot emit, each row carrying a reason and a category. */
  readonly gaps: readonly Gap[];
  /** Modelled paths the pinned schema does not enumerate, each row carrying a reason. */
  readonly overclaims: readonly Overclaim[];
}

/** The four set differences, in both directions, so a path cannot go missing or outlive its row. */
const describeGateRules = ({
  schemaPaths,
  modelledPaths,
  gaps,
  overclaims,
}: SchemaGapGateOptions): void => {
  describe("schema gap gate", () => {
    it("models or declares every schema path", () => {
      const undeclared = undeclaredSchemaPaths(schemaPaths, modelledPaths, gaps);

      expect(remedies(undeclared, gapRemedies)).toStrictEqual([]);
    });

    it("declares no gap the schema does not allow", () => {
      expect(offenders(orphanedGapPaths(schemaPaths, gaps))).toStrictEqual([]);
    });

    it("declares no gap the vocabulary already models", () => {
      expect(remedies(staleGapPaths(modelledPaths, gaps), staleGapRemedies)).toStrictEqual([]);
    });

    it("declares every modelled path the schema lacks", () => {
      const undeclared = undeclaredOverclaimPaths(schemaPaths, modelledPaths, overclaims);

      expect(offenders(undeclared)).toStrictEqual([]);
    });

    it("declares no overclaim for a path the schema allows", () => {
      const unused = unusedOverclaimPaths(schemaPaths, modelledPaths, overclaims);

      expect(offenders(unused)).toStrictEqual([]);
    });
  });
};

/** The shape every row list owes, so a report stays ordered, closed and explained. */
const describeReportRules = ({ schemaPaths, gaps, overclaims }: SchemaGapGateOptions): void => {
  const gapPaths = gaps.map((gap) => gap.path);
  const overclaimPaths = overclaims.map((overclaim) => overclaim.path);

  describe("schema gap report", () => {
    it("lists gaps sorted and de-duplicated", () => {
      expect(offenders(outOfOrder(gapPaths))).toStrictEqual([]);
    });

    it("lists overclaims sorted and de-duplicated", () => {
      expect(offenders(outOfOrder(overclaimPaths))).toStrictEqual([]);
    });

    it("uses only the closed category vocabulary", () => {
      const open = gaps.filter((gap) => !CLOSED_CATEGORIES.includes(gap.category));

      expect(offenders(open.map((gap) => gap.path))).toStrictEqual([]);
    });

    it("gives every declared row a reason", () => {
      const silent = [...gaps, ...overclaims].filter((row) => row.reason.trim() === "");

      expect(offenders(silent.map((row) => row.path))).toStrictEqual([]);
    });

    it("names each schema path once", () => {
      expect(offenders(outOfOrder(schemaPaths))).toStrictEqual([]);
    });
  });
};

/**
 * Asserts one provider's documented-grammar gate. The rules are the union every provider owes, so a
 * provider cannot drop one by writing its own file; only its negative cases and its own shapes stay
 * beside the call.
 */
export const describeSchemaGapGate = (options: SchemaGapGateOptions): void => {
  describeGateRules(options);
  describeReportRules(options);
};
