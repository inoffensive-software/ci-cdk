import { describe, expect, it } from "vitest";

import { describeCoverageDebt } from "../coverage.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { GITLAB_ENTRIES } from "./entries.js";
import { rawPathsOf } from "./exhaustiveness.js";

/**
 * The ledger's end state: no corpus key needs `raw`. Kept as its own test because the generic gate
 * compares two sets and would pass an empty ledger against fixtures that used no raw at all.
 */
describe("coverage debt: empty ledger", () => {
  it("declares no raw path at all", () => {
    expect(COVERAGE_DEBT).toStrictEqual([]);
  });
});

describeCoverageDebt({
  fixtures: GITLAB_ENTRIES.map((entry) => entry.pipeline),
  rawPathsOf,
  debt: COVERAGE_DEBT,
});
