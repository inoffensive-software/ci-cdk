import { describeCoverageDebt } from "../coverage.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { GITLAB_ENTRIES } from "./entries.js";
import { rawPathsOf } from "./exhaustiveness.js";

describeCoverageDebt({
  fixtures: GITLAB_ENTRIES.map((entry) => entry.pipeline),
  rawPathsOf,
  debt: COVERAGE_DEBT,
});
