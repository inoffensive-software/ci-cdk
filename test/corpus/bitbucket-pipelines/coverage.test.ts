import { describe, expect, it } from "vitest";
import {
  type PipelineConfig,
  type PipelineItem,
  type Pipelines,
  pipelineConfig,
  step,
} from "../../../src/bitbucket-pipelines/index.js";
import { describeCoverageDebt } from "../coverage.js";
import { keyPath } from "../paths.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { CONNECT_EXPRESS } from "./connect-express.fixture.js";
import { SYSTEMSDK_SYMFONY } from "./systemsdk-symfony.fixture.js";

/** The raw keys one step item wrote, named at the path the item sits on. */
const stepPathsOf = (items: readonly PipelineItem[], base: string): readonly string[] =>
  items.flatMap((item, index) =>
    Object.keys(item.step.raw ?? {}).map((key) => keyPath(`${base}[${index}].step.raw`, key)),
  );

const selectorPathsOf = (
  section: "branches" | "tags" | "pull-requests",
  entries: Pipelines["branches"],
): readonly string[] => {
  const base = keyPath("$.pipelines", section);

  return (entries ?? []).flatMap((selector, index) =>
    stepPathsOf(selector.pipeline, `${base}[${index}].pipeline`),
  );
};

/** Every raw key a fixture wrote, at the level it wrote it. */
const rawPathsOf = (config: PipelineConfig): readonly string[] => {
  const paths = Object.keys(config.raw ?? {}).map((key) => keyPath("$.raw", key));

  paths.push(
    ...stepPathsOf(config.definitions?.steps ?? [], "$.definitions.steps"),
    ...stepPathsOf(config.pipelines.default ?? [], "$.pipelines.default"),
    ...selectorPathsOf("branches", config.pipelines.branches),
    ...selectorPathsOf("tags", config.pipelines.tags),
    ...selectorPathsOf("pull-requests", config.pipelines["pull-requests"]),
  );

  return paths;
};

const PIPELINES = [CONNECT_EXPRESS, SYSTEMSDK_SYMFONY];

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

  it("names raw paths in definitions.steps, tags and pull-requests", () => {
    const shared = { script: ["true"], raw: { artifacts: ["reports/**"] } };

    const config = pipelineConfig({
      definitions: { steps: [step(shared)] },
      pipelines: {
        tags: [{ pattern: "*", pipeline: [step(shared)] }],
        "pull-requests": [{ pattern: "**", pipeline: [step(shared)] }],
      },
    });

    expect(rawPathsOf(config)).toStrictEqual([
      "$.definitions.steps[0].step.raw.artifacts",
      "$.pipelines.tags[0].pipeline[0].step.raw.artifacts",
      '$.pipelines["pull-requests"][0].pipeline[0].step.raw.artifacts',
    ]);
  });
});
