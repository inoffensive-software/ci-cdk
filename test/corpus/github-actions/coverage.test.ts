import type { Workflow } from "../../../src/github-actions/index.js";
import { describeCoverageDebt } from "../coverage.js";
import { keyPath } from "../paths.js";
import { ANYHOW } from "./anyhow.fixture.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { GOT } from "./got.fixture.js";
import { TRPC_MAIN } from "./trpc-main.fixture.js";
import { TRPC_RELEASE } from "./trpc-release.fixture.js";

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

const WORKFLOWS = [GOT, ANYHOW, TRPC_MAIN, TRPC_RELEASE];

describeCoverageDebt({ fixtures: WORKFLOWS, rawPathsOf, debt: COVERAGE_DEBT });
