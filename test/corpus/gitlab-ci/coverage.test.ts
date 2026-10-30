import type { Pipeline } from "../../../src/gitlab-ci/index.js";
import { describeCoverageDebt } from "../coverage.js";
import { keyPath } from "../paths.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { TERRAFORM_IMAGES } from "./terraform-images.fixture.js";

/** Every raw key a fixture wrote, at the level it wrote it. */
const rawPathsOf = (pipeline: Pipeline): readonly string[] => {
  const paths = Object.keys(pipeline.raw ?? {}).map((key) => keyPath("$.raw", key));

  for (const [index, job] of pipeline.jobs.entries()) {
    paths.push(...Object.keys(job.raw ?? {}).map((key) => keyPath(`$.jobs[${index}].raw`, key)));
  }

  return paths;
};

const PIPELINES = [TERRAFORM_IMAGES];

describeCoverageDebt({ fixtures: PIPELINES, rawPathsOf, debt: COVERAGE_DEBT });
