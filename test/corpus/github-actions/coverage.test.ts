import { describe, expect, it } from "vitest";

import type { Workflow } from "../../../src/github-actions/index.js";
import { keyPath } from "../paths.js";
import { anyhow } from "./anyhow.fixture.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { got } from "./got.fixture.js";
import { trpcMain } from "./trpc-main.fixture.js";

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

const workflows = [got, anyhow, trpcMain];

describe("coverage debt", () => {
  it("declares exactly the raw paths the fixtures use, in both directions", () => {
    const declared = COVERAGE_DEBT.map((debt) => debt.path).toSorted();
    const used = workflows.flatMap(rawPathsOf).toSorted();

    expect(declared).toStrictEqual(used);
  });

  it("gives every declared path a reason", () => {
    expect(COVERAGE_DEBT.every((debt) => debt.reason.trim() !== "")).toBe(true);
  });

  it("scans the fixtures", () => {
    expect(workflows).not.toHaveLength(0);
  });
});
