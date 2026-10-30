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
});

describe("schema gap failure cases", () => {
  it("reports an invented schema path with no row, naming both remedies", () => {
    const invented = "$.jobs.*.invented";

    expect(undeclaredSchemaPaths([...SCHEMA_PATHS, invented], MODELLED_PATHS, GAPS)).toStrictEqual([
      invented,
    ]);
    expect(gapRemedies(invented)).toContain("model it in the vocabulary");
    expect(gapRemedies(invented)).toContain("add a row to GAPS");
  });

  it("reports a GAPS row with no schema path", () => {
    const invented = "$.not.in.the.schema";
    const inventedRow: Gap = { path: invented, reason: "invented", category: "unmodelled" };

    expect(orphanedGapPaths(SCHEMA_PATHS, [...GAPS, inventedRow])).toStrictEqual([invented]);
  });

  it("reports a modelled path the schema lacks as an overclaim", () => {
    const invented = "$.jobs.*.invented";

    expect(
      undeclaredOverclaimPaths(SCHEMA_PATHS, [...MODELLED_PATHS, invented], OVERCLAIMS),
    ).toStrictEqual([invented]);
  });

  it("reports an overclaim row that names no modelled path", () => {
    const invented = "$.not.modelled";
    const inventedRow: Overclaim = { path: invented, reason: "invented" };

    expect(
      unusedOverclaimPaths(SCHEMA_PATHS, MODELLED_PATHS, [...OVERCLAIMS, inventedRow]),
    ).toStrictEqual([invented]);
  });

  it("reports an overclaim row for a path the schema already allows", () => {
    const allowed = "$.name";

    expect(
      unusedOverclaimPaths(
        SCHEMA_PATHS,
        [...MODELLED_PATHS, allowed],
        [...OVERCLAIMS, { path: allowed, reason: "invented" }],
      ),
    ).toStrictEqual([allowed]);
  });
});
