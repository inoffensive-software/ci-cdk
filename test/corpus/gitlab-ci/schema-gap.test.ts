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
const OVERCLAIM_PATHS = OVERCLAIMS.map((overclaim) => overclaim.path);

/** A hidden key is author data: `.`-prefixed at the document root, and never part of the grammar. */
const HIDDEN = '$[".';

const isHidden = (path: string): boolean => path.startsWith(HIDDEN);

/** A row covers its subtree only: a dotted child or a sequence under it, never a partial segment. */
const subsumes = (row: string, path: string): boolean =>
  path !== row && (path.startsWith(`${row}.`) || path.startsWith(`${row}[`));

/** A row declares its own path and everything below it. */
const covers = (row: string, path: string): boolean => path === row || subsumes(row, path);

describe("gap row subsumption", () => {
  it("needs no row for a path below a declared gap", () => {
    const keyword: Gap = {
      path: "$.*.artifacts",
      reason: "invented",
      category: "unmodelled",
    };

    const deeper = "$.*.artifacts.reports.junit[]";

    expect(undeclaredSchemaPaths([keyword.path, deeper], [], [keyword])).toStrictEqual([]);
  });

  it("fails on the whole subtree when a top-level row is removed", () => {
    const removed = "$.*.image.docker";
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

describe("hidden templates", () => {
  it("keeps hidden keys out of the modelled set", () => {
    expect(MODELLED_PATHS.filter((path) => isHidden(path))).toStrictEqual([]);
  });

  it("keeps hidden keys out of the documented grammar", () => {
    expect(SCHEMA_PATHS.filter((path) => isHidden(path))).toStrictEqual([]);
  });

  it("keeps hidden keys out of the report", () => {
    expect([...GAP_PATHS, ...OVERCLAIM_PATHS].filter((path) => isHidden(path))).toStrictEqual([]);
  });
});

/**
 * The completion target spec 0009 decision 9 sets: 928 of the 1,061 schema paths are modelled, and
 * `out-of-scope` holds the architectural non-goals alone. The counts derive from the three lists, so
 * a ticket that moves rows from `unmodelled` to modelled keeps the sum without editing this test.
 */
describe("completion target", () => {
  const modelled = new Set(MODELLED_PATHS);

  const schemaPathsCoveredBy = (category: string): readonly string[] =>
    SCHEMA_PATHS.filter(
      (path) =>
        !modelled.has(path) &&
        GAPS.some((gap) => gap.category === category && covers(gap.path, path)),
    );

  const modelledSchemaPaths = SCHEMA_PATHS.filter((path) => modelled.has(path));

  it("leaves no schema path outside the target", () => {
    const unmodelled = schemaPathsCoveredBy("unmodelled");

    expect(modelledSchemaPaths.length + unmodelled.length).toBe(928);
  });

  it("reserves out-of-scope for the spec header", () => {
    const rows = GAPS.filter((gap) => gap.category === "out-of-scope").map((gap) => gap.path);

    expect(rows).toStrictEqual(["$.spec"]);
    expect(schemaPathsCoveredBy("out-of-scope")).toStrictEqual(
      SCHEMA_PATHS.filter((path) => covers("$.spec", path)),
    );
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

  it("reports a GAPS row for a path the vocabulary already models", () => {
    const stale: Gap = { path: "$.*.invented", reason: "invented", category: "unmodelled" };

    expect(staleGapPaths([...MODELLED_PATHS, stale.path], [stale])).toStrictEqual([stale.path]);
    expect(staleGapRemedies(stale.path)).toContain("delete the row");
  });

  it("reports a modelled path the schema lacks as an overclaim", () => {
    const invented = "$.*.invented";

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
    const allowed = "$.stages";

    expect(
      unusedOverclaimPaths(
        SCHEMA_PATHS,
        [...MODELLED_PATHS, allowed],
        [...OVERCLAIMS, { path: allowed, reason: "invented" }],
      ),
    ).toStrictEqual([allowed]);
  });
});
