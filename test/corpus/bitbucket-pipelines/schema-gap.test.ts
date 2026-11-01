import { describe, expect, it } from "vitest";

import { describeSchemaGapGate } from "../../schemas/schema-gap.js";
import {
  GAPS,
  MODELLED_PATHS,
  OVERCLAIMS,
  SCHEMA_PATHS,
  type Gap,
  type Overclaim,
  gapRemedies,
  orphanedGapPaths,
  staleGapPaths,
  staleGapRemedies,
  subsumes,
  undeclaredOverclaimPaths,
  undeclaredSchemaPaths,
  unusedOverclaimPaths,
} from "./schema-gap.js";

describeSchemaGapGate({
  schemaPaths: SCHEMA_PATHS,
  modelledPaths: MODELLED_PATHS,
  gaps: GAPS,
  overclaims: OVERCLAIMS,
});

const GAP_PATHS = GAPS.map((gap) => gap.path);

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
    const removed = "$.definitions.imports";
    const withoutRow = GAPS.filter((gap) => gap.path !== removed);
    const undeclared = undeclaredSchemaPaths(SCHEMA_PATHS, MODELLED_PATHS, withoutRow);

    expect(undeclared).toContain(removed);
    expect(undeclared.some((path) => subsumes(removed, path))).toBe(true);
  });

  it("keeps no row that another row already subsumes", () => {
    const subsumed = GAP_PATHS.filter((path) =>
      GAP_PATHS.some((row) => row !== path && subsumes(row, path)),
    );

    expect(subsumed).toStrictEqual([]);
  });
});

describe("overclaim row subsumption", () => {
  it("reports the whole subtree when a keyword row is removed", () => {
    const removed = "$.definitions.steps";
    const withoutRow = OVERCLAIMS.filter((overclaim) => overclaim.path !== removed);
    const undeclared = undeclaredOverclaimPaths(SCHEMA_PATHS, MODELLED_PATHS, withoutRow);

    expect(undeclared).toContain(`${removed}[]`);
    expect(undeclared.some((path) => subsumes(removed, path))).toBe(true);
  });
});

describe("stale gap rows", () => {
  it("reports a GAPS row for a path the vocabulary already models", () => {
    const stale: Gap = {
      path: "$.pipelines.default[].invented",
      reason: "invented",
      category: "unmodelled",
    };

    expect(staleGapPaths([...MODELLED_PATHS, stale.path], [stale])).toStrictEqual([stale.path]);
    expect(staleGapRemedies(stale.path)).toContain("delete the row");
  });
});

/** Every failure case invents one path, so the assertions read as the same rule four ways. */
const INVENTED_GAP: Gap = {
  path: "$.not.in.the.schema",
  reason: "invented",
  category: "unmodelled",
};

const INVENTED_OVERCLAIM: Overclaim = { path: "$.not.modelled", reason: "invented" };

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
    expect(orphanedGapPaths(SCHEMA_PATHS, [...GAPS, INVENTED_GAP])).toStrictEqual([
      INVENTED_GAP.path,
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
      unusedOverclaimPaths(SCHEMA_PATHS, MODELLED_PATHS, [...OVERCLAIMS, INVENTED_OVERCLAIM]),
    ).toStrictEqual([INVENTED_OVERCLAIM.path]);
  });

  it("reports an overclaim row for a path the schema already allows", () => {
    const allowed = "$.options";

    expect(
      unusedOverclaimPaths(
        SCHEMA_PATHS,
        [...MODELLED_PATHS, allowed],
        [...OVERCLAIMS, { path: allowed, reason: "invented" }],
      ),
    ).toStrictEqual([allowed]);
  });
});
