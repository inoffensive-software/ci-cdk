import type { Diagnostic } from "../core/index.js";
import { keyPath } from "../core/paths.js";
import type {
  PipelineConfig,
  PipelineItem,
  Pipelines,
  Pipe,
  ScriptItem,
  SelectorPipeline,
} from "./types.js";

const DEFAULT_PATH = "$.pipelines.default";

const isPipe = (item: ScriptItem): item is Pipe => typeof item !== "string" && "pipe" in item;

const conditionProblems = (item: PipelineItem, stepPath: string): readonly Diagnostic[] => {
  const changesets = item.step.condition?.changesets;

  if (changesets === undefined) {
    return [];
  }

  const hasIncludePaths = "includePaths" in changesets && changesets.includePaths !== undefined;
  const hasExcludePaths = "excludePaths" in changesets && changesets.excludePaths !== undefined;
  const path = `${stepPath}.condition.changesets`;

  if (!hasIncludePaths && !hasExcludePaths) {
    return [{ path, message: "changesets needs includePaths or excludePaths" }];
  }

  if (hasIncludePaths && hasExcludePaths) {
    return [{ path, message: "changesets takes includePaths or excludePaths, not both" }];
  }

  return [];
};

const stepProblems = (items: readonly PipelineItem[], base: string): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const [index, item] of items.entries()) {
    const stepPath = `${base}[${index}].step`;
    const scriptPath = `${stepPath}.script`;

    if (item.step.script.length === 0) {
      diagnostics.push({
        path: scriptPath,
        message: "script must contain at least one command",
      });
    }

    for (const [scriptIndex, scriptItem] of item.step.script.entries()) {
      if (isPipe(scriptItem) && scriptItem.pipe === "") {
        diagnostics.push({
          path: `${scriptPath}[${scriptIndex}].pipe`,
          message: "pipe must not be empty",
        });
      }
    }

    diagnostics.push(...conditionProblems(item, stepPath));
  }

  return diagnostics;
};

/** One reusable-definition record: every author-chosen key must be non-empty. */
const blankNameProblems = <T>(
  record: Readonly<Record<string, T>> | undefined,
  base: string,
): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const name of Object.keys(record ?? {})) {
    if (name === "") {
      diagnostics.push({
        path: keyPath(base, name),
        message: "definition name must not be empty",
      });
    }
  }

  return diagnostics;
};

const definitionProblems = (config: PipelineConfig): readonly Diagnostic[] => {
  const definitions = config.definitions;

  return [
    ...blankNameProblems(definitions?.caches, "$.definitions.caches"),
    ...blankNameProblems(definitions?.services, "$.definitions.services"),
    ...stepProblems(definitions?.steps ?? [], "$.definitions.steps"),
  ];
};

const defaultProblems = (config: PipelineConfig): readonly Diagnostic[] => {
  const pipeline = config.pipelines.default;

  if (pipeline === undefined) {
    return [];
  }

  if (pipeline.length === 0) {
    return [{ path: DEFAULT_PATH, message: "pipeline must contain at least one item" }];
  }

  return stepProblems(pipeline, DEFAULT_PATH);
};

/** One selector section: empty patterns, duplicates within the section, and empty pipelines. */
const selectorProblems = (
  section: "branches" | "tags" | "pull-requests",
  entries: readonly SelectorPipeline[] | undefined,
): readonly Diagnostic[] => {
  if (entries === undefined) {
    return [];
  }

  const sectionPath = keyPath("$.pipelines", section);
  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();

  for (const [index, selector] of entries.entries()) {
    const patternPath = `${sectionPath}[${index}].pattern`;
    const pipelinePath = `${sectionPath}[${index}].pipeline`;

    if (selector.pattern === "") {
      diagnostics.push({ path: patternPath, message: "pattern must not be empty" });
    }

    if (seen.has(selector.pattern)) {
      diagnostics.push({
        path: patternPath,
        message: `duplicate pattern "${selector.pattern}": two pipelines for one branch`,
      });
    } else {
      seen.add(selector.pattern);
    }

    if (selector.pipeline.length === 0) {
      diagnostics.push({
        path: pipelinePath,
        message: "pipeline must contain at least one item",
      });
    } else {
      diagnostics.push(...stepProblems(selector.pipeline, pipelinePath));
    }
  }

  return diagnostics;
};

const declaresPipeline = (pipelines: Pipelines): boolean =>
  pipelines.default !== undefined ||
  pipelines.branches !== undefined ||
  pipelines.tags !== undefined ||
  pipelines["pull-requests"] !== undefined;

/**
 * Whole-document checks. It only collects; `toDoc` is the one place that throws. Raw collisions are
 * found while lowering, because they depend on what the modelled keys emit, so they are not here.
 */
export const validate = (config: PipelineConfig): readonly Diagnostic[] => {
  const { pipelines } = config;

  const diagnostics: Diagnostic[] = declaresPipeline(pipelines)
    ? []
    : [{ path: "$.pipelines", message: "pipelines must declare at least one pipeline" }];

  return [
    ...diagnostics,
    ...definitionProblems(config),
    ...defaultProblems(config),
    ...selectorProblems("branches", pipelines.branches),
    ...selectorProblems("tags", pipelines.tags),
    ...selectorProblems("pull-requests", pipelines["pull-requests"]),
  ];
};
