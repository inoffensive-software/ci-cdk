import { describe, expect, it } from "vitest";

import type { Workflow } from "../../../src/github-actions/index.js";
import { describeCoverageDebt } from "../coverage.js";
import { keyPath } from "../paths.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { ENTRIES } from "./entries.js";

/** Every raw key a fixture wrote, at the level it wrote it. */
const rawPathsOf = (workflow: Workflow): readonly string[] => {
  const paths = Object.keys(workflow.raw ?? {}).map((key) => keyPath("$.raw", key));

  for (const [index, job] of workflow.jobs.entries()) {
    const jobPath = `$.jobs[${index}]`;

    paths.push(...Object.keys(job.raw ?? {}).map((key) => keyPath(`${jobPath}.raw`, key)));

    for (const [stepIndex, step] of (job.steps ?? []).entries()) {
      paths.push(
        ...Object.keys(step.raw ?? {}).map((key) =>
          keyPath(`${jobPath}.steps[${stepIndex}].raw`, key),
        ),
      );
    }
  }

  return paths;
};

describeCoverageDebt({
  fixtures: ENTRIES.map((entry) => entry.workflow),
  rawPathsOf,
  debt: COVERAGE_DEBT,
});

describe("coverage ledger", () => {
  it("has no remaining paths", () => {
    expect(COVERAGE_DEBT.map((row) => row.path)).toStrictEqual([]);
  });
});
