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
