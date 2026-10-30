import {
  type PipelineConfig,
  type PipelineItem,
  type Pipelines,
} from "../../../src/bitbucket-pipelines/index.js";
import { keyPath } from "../paths.js";

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

/**
 * Every raw key a config wrote, at the level it wrote it, in the diagnostic notation. A `raw` entry
 * is named where the author put it, so the ledger and the gate can point at the same key.
 */
export const rawPathsOf = (config: PipelineConfig): readonly string[] => {
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
