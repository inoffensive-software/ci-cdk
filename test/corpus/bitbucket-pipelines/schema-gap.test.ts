import { describe, expect, it } from "vitest";

import {
  GAPS,
  GAP_CATEGORIES,
  type Gap,
  type GapCategory,
  MODELLED_PATHS,
  type Overclaim,
  OVERCLAIMS,
  SCHEMA_PATHS,
  gapRemedies,
  orphanedGapPaths,
  undeclaredOverclaimPaths,
  undeclaredSchemaPaths,
  unusedOverclaimPaths,
} from "./schema-gap.js";

const GAP_PATHS = GAPS.map((gap) => gap.path);
const OVERCLAIM_PATHS = OVERCLAIMS.map((overclaim) => overclaim.path);
const CLOSED_CATEGORIES: readonly GapCategory[] = GAP_CATEGORIES;

describe("schema gap gate", () => {
  it("models or declares every schema path", () => {
    expect(undeclaredSchemaPaths(SCHEMA_PATHS, MODELLED_PATHS, GAPS)).toStrictEqual([]);
  });

  it("declares no gap the schema does not allow", () => {
    expect(orphanedGapPaths(SCHEMA_PATHS, GAPS)).toStrictEqual([]);
  });

  it("declares every modelled path the schema lacks", () => {
    expect(undeclaredOverclaimPaths(SCHEMA_PATHS, MODELLED_PATHS, OVERCLAIMS)).toStrictEqual([]);
  });

  it("declares no overclaim for a path the schema allows", () => {
    expect(unusedOverclaimPaths(SCHEMA_PATHS, MODELLED_PATHS, OVERCLAIMS)).toStrictEqual([]);
  });
});

describe("schema gap report", () => {
  it("lists gaps sorted and de-duplicated", () => {
    expect(GAP_PATHS).toStrictEqual([...new Set(GAP_PATHS)].toSorted());
  });

  it("lists overclaims sorted and de-duplicated", () => {
    expect(OVERCLAIM_PATHS).toStrictEqual([...new Set(OVERCLAIM_PATHS)].toSorted());
  });

  it("uses only the closed category vocabulary", () => {
    expect(GAPS.filter((gap) => !CLOSED_CATEGORIES.includes(gap.category))).toStrictEqual([]);
  });

  it("gives every declared row a reason", () => {
    expect([...GAPS, ...OVERCLAIMS].filter((row) => row.reason.trim() === "")).toStrictEqual([]);
  });

  it("names each schema path once", () => {
    expect(SCHEMA_PATHS).toStrictEqual([...new Set(SCHEMA_PATHS)].toSorted());
  });
});

/** A row covers its subtree only: a dotted child or a sequence under it, never a partial segment. */
const subsumes = (row: string, path: string): boolean =>
  path !== row && (path.startsWith(`${row}.`) || path.startsWith(`${row}[`));

describe("gap row subsumption", () => {
  it("needs no row for a path below a declared gap", () => {
    const keyword: Gap = {
      path: "$.pipelines.default[].step.artifacts",
      reason: "invented",
      category: "unmodelled",
    };

    const deeper = "$.pipelines.default[].step.artifacts.download";

    expect(undeclaredSchemaPaths([keyword.path, deeper], [], [keyword])).toStrictEqual([]);
  });

  it("fails on the whole subtree when a top-level row is removed", () => {
    const removed = "$.definitions.agents";
    const withoutRow = GAPS.filter((gap) => gap.path !== removed);
    const undeclared = undeclaredSchemaPaths(SCHEMA_PATHS, MODELLED_PATHS, withoutRow);

    expect(undeclared).toContain(removed);
    expect(undeclared.some((path) => subsumes(removed, path))).toBe(true);
  });

  it("keeps no row that another row already subsumes", () => {
    const subsumed = GAP_PATHS.filter((path) => GAP_PATHS.some((row) => subsumes(row, path)));

    expect(subsumed).toStrictEqual([]);
  });
});

/** Every failure case invents one path, so the assertions read as the same rule four ways. */
const inventedGap: Gap = {
  path: "$.not.in.the.schema",
  reason: "invented",
  category: "unmodelled",
};

const inventedOverclaim: Overclaim = { path: "$.not.modelled", reason: "invented" };

describe("schema gap failure cases", () => {
  it("reports an invented schema path with no row, naming both remedies", () => {
    const invented = "$.invented";

    expect(undeclaredSchemaPaths([...SCHEMA_PATHS, invented], MODELLED_PATHS, GAPS)).toStrictEqual([
      invented,
    ]);
    expect(gapRemedies(invented)).toContain("model it in the vocabulary");
    expect(gapRemedies(invented)).toContain("add a row to GAPS");
  });

  it("reports a GAPS row with no schema path", () => {
    expect(orphanedGapPaths(SCHEMA_PATHS, [...GAPS, inventedGap])).toStrictEqual([
      inventedGap.path,
    ]);
  });

  it("reports a modelled path the schema lacks as an overclaim", () => {
    const invented = "$.pipelines.default[].invented";

    expect(
      undeclaredOverclaimPaths(SCHEMA_PATHS, [...MODELLED_PATHS, invented], OVERCLAIMS),
    ).toStrictEqual([invented]);
  });

  it("reports an overclaim row that names no modelled path", () => {
    expect(
      unusedOverclaimPaths(SCHEMA_PATHS, MODELLED_PATHS, [...OVERCLAIMS, inventedOverclaim]),
    ).toStrictEqual([inventedOverclaim.path]);
  });

  it("reports an overclaim row for a path the schema already allows", () => {
    const allowed = "$.pipelines.default[]";

    expect(
      unusedOverclaimPaths(
        SCHEMA_PATHS,
        [...MODELLED_PATHS, allowed],
        [...OVERCLAIMS, { path: allowed, reason: "invented" }],
      ),
    ).toStrictEqual([allowed]);
  });
});
