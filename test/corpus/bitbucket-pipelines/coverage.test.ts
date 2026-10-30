import { describe, expect, it } from "vitest";
import {
  type PipelineConfig,
  type PipelineItem,
  type Pipelines,
  finalStep,
  parallel,
  pipelineConfig,
  stage,
  step,
} from "../../../src/bitbucket-pipelines/index.js";
import { describeCoverageDebt } from "../coverage.js";
import { keyPath } from "../paths.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { ALIGENT_GRAPHQL_MESH } from "./aligent-graphql-mesh.fixture.js";
import { CONNECT_EXPRESS } from "./connect-express.fixture.js";
import { OBUSPA } from "./obuspa.fixture.js";
import { RAIR_DAPP } from "./rair-dapp.fixture.js";
import { SYSTEMSDK_SYMFONY } from "./systemsdk-symfony.fixture.js";

/** Every raw key one item wrote, at the path the item sits on. */
const itemRawPaths = (item: PipelineItem, itemPath: string): readonly string[] => {
  if ("step" in item) {
    return Object.keys(item.step.raw ?? {}).map((key) => keyPath(`${itemPath}.step.raw`, key));
  }

  if ("final" in item) {
    return Object.keys(item.final.raw ?? {}).map((key) => keyPath(`${itemPath}.final.raw`, key));
  }

  if ("parallel" in item) {
    const map = "steps" in item.parallel;
    const steps = map ? item.parallel.steps : item.parallel;
    const base = map ? `${itemPath}.parallel.steps` : `${itemPath}.parallel`;

    return steps.flatMap((stepItem, index) => itemRawPaths(stepItem, `${base}[${index}]`));
  }

  return [
    ...Object.keys(item.stage.raw ?? {}).map((key) => keyPath(`${itemPath}.stage.raw`, key)),
    ...item.stage.steps.flatMap((stepItem, index) =>
      itemRawPaths(stepItem, `${itemPath}.stage.steps[${index}]`),
    ),
  ];
};

/** The raw keys one pipeline wrote, named at the path the pipeline sits on. */
const stepPathsOf = (items: readonly PipelineItem[], base: string): readonly string[] =>
  items.flatMap((item, index) => itemRawPaths(item, `${base}[${index}]`));

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
    ...(config.pipelines.custom ?? []).flatMap((entry, index) =>
      stepPathsOf(entry.pipeline, `$.pipelines.custom[${index}].pipeline`),
    ),
  );

  return paths;
};

const PIPELINES = [CONNECT_EXPRESS, ALIGENT_GRAPHQL_MESH, OBUSPA, RAIR_DAPP, SYSTEMSDK_SYMFONY];

describeCoverageDebt({ fixtures: PIPELINES, rawPathsOf, debt: COVERAGE_DEBT });

describe("coverage ledger", () => {
  it("is empty: every key the corpus uses has a modelled field", () => {
    expect(COVERAGE_DEBT).toStrictEqual([]);
  });
});

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

describe("rawPathsOf composition", () => {
  it("descends into stages, parallel groups, final steps and custom pipelines", () => {
    const config = pipelineConfig({
      pipelines: {
        branches: [
          {
            pattern: "main",
            pipeline: [
              stage({ name: "Deploy", steps: [step({ script: ["true"], raw: { size: "2x" } })] }),
              parallel([step({ script: ["true"], raw: { artifacts: ["dist/**"] } })]),
            ],
          },
        ],
        custom: [
          {
            name: "cleanup",
            pipeline: [finalStep({ script: ["true"], raw: { deployment: "none" } })],
          },
        ],
      },
    });

    expect(rawPathsOf(config)).toStrictEqual([
      "$.pipelines.branches[0].pipeline[0].stage.steps[0].step.raw.size",
      "$.pipelines.branches[0].pipeline[1].parallel[0].step.raw.artifacts",
      "$.pipelines.custom[0].pipeline[0].final.raw.deployment",
    ]);
  });
});
