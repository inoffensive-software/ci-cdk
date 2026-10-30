import { describe, expect, it } from "vitest";

import type { Workflow } from "../../../src/github-actions/index.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import * as fixtures from "./fixtures.js";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

/** The diagnostic notation, so a ledger row reads exactly like the path an author would be given. */
const keyPath = (path: string, key: string): string =>
  IDENTIFIER.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;

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

describe("coverage debt", () => {
  it("declares exactly the raw paths the fixtures use, in both directions", () => {
    const declared = COVERAGE_DEBT.map((debt) => debt.path).toSorted();
    const used = Object.values(fixtures).flatMap(rawPathsOf).toSorted();

    expect(declared).toStrictEqual(used);
  });

  it("gives every declared path a reason", () => {
    expect(COVERAGE_DEBT.every((debt) => debt.reason.trim() !== "")).toBe(true);
  });

  it("scans the fixtures", () => {
    expect(Object.keys(fixtures)).not.toHaveLength(0);
  });
});
