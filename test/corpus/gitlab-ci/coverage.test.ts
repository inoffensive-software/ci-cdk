import { describe, expect, it } from "vitest";

import type { Pipeline } from "../../../src/gitlab-ci/index.js";
import { keyPath } from "../paths.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { terraformImages } from "./terraform-images.fixture.js";

/** Every raw key a fixture wrote, at the level it wrote it. */
const rawPathsOf = (pipeline: Pipeline): readonly string[] => {
  const paths = Object.keys(pipeline.raw ?? {}).map((key) => keyPath("$.raw", key));

  for (const [index, job] of pipeline.jobs.entries()) {
    paths.push(...Object.keys(job.raw ?? {}).map((key) => keyPath(`$.jobs[${index}].raw`, key)));
  }

  return paths;
};

const pipelines = [terraformImages];

describe("coverage debt", () => {
  it("declares exactly the raw paths the fixtures use, in both directions", () => {
    const declared = COVERAGE_DEBT.map((debt) => debt.path).toSorted();
    const used = pipelines.flatMap(rawPathsOf).toSorted();

    expect(declared).toStrictEqual(used);
  });

  it("gives every declared path a reason", () => {
    expect(COVERAGE_DEBT.every((debt) => debt.reason.trim() !== "")).toBe(true);
  });

  it("scans the fixtures", () => {
    expect(pipelines).not.toHaveLength(0);
  });
});
