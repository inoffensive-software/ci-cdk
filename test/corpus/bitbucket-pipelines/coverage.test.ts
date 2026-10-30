import { describe, expect, it } from "vitest";
import {
  type PipelineConfig,
  pipelineConfig,
  step,
} from "../../../src/bitbucket-pipelines/index.js";
import { describeCoverageDebt } from "../coverage.js";
import { keyPath } from "../paths.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { CONNECT_EXPRESS } from "./connect-express.fixture.js";

/** Every raw key a fixture wrote, at the level it wrote it. */
const rawPathsOf = (config: PipelineConfig): readonly string[] => {
  const paths = Object.keys(config.raw ?? {}).map((key) => keyPath("$.raw", key));

  for (const [index, item] of (config.pipelines.default ?? []).entries()) {
    const path = `$.pipelines.default[${index}].step.raw`;

    paths.push(...Object.keys(item.step.raw ?? {}).map((key) => keyPath(path, key)));
  }

  for (const [index, section] of (config.pipelines.branches ?? []).entries()) {
    for (const [itemIndex, item] of section.pipeline.entries()) {
      const path = `$.pipelines.branches[${index}].pipeline[${itemIndex}].step.raw`;

      paths.push(...Object.keys(item.step.raw ?? {}).map((key) => keyPath(path, key)));
    }
  }

  return paths;
};

const PIPELINES = [CONNECT_EXPRESS];

describeCoverageDebt({ fixtures: PIPELINES, rawPathsOf, debt: COVERAGE_DEBT });

describe("rawPathsOf", () => {
  it("names the raw path where each step declares it", () => {
    const config = pipelineConfig({
      pipelines: {
        default: [step({ script: ["npm test"], raw: { artifacts: ["dist/**"] } })],
        branches: [
          {
            pattern: "main",
            pipeline: [step({ script: ["npm test"], raw: { deployment: "staging" } })],
          },
        ],
      },
    });

    expect(rawPathsOf(config)).toStrictEqual([
      "$.pipelines.default[0].step.raw.artifacts",
      "$.pipelines.branches[0].pipeline[0].step.raw.deployment",
    ]);
  });
});
