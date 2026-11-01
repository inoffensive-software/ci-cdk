import { duplicatesBy } from "../core/index.js";
import type { Diagnostic } from "../core/index.js";
import { keyPath } from "../core/paths.js";
import { pipelineProblems } from "./item-problems.js";
import type {
  CustomVariable,
  NamedPipeline,
  PipelineConfig,
  Pipelines,
  SelectorPipeline,
  Triggers,
} from "./types.js";

const DEFAULT_PATH = "$.pipelines.default";

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
    ...pipelineProblems(definitions?.steps ?? [], "$.definitions.steps"),
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

  return pipelineProblems(pipeline, DEFAULT_PATH);
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
  const repeated = duplicatesBy(entries, (entry) => entry.pattern);

  for (const [index, selector] of entries.entries()) {
    const patternPath = `${sectionPath}[${index}].pattern`;
    const pipelinePath = `${sectionPath}[${index}].pipeline`;

    if (selector.pattern === "") {
      diagnostics.push({ path: patternPath, message: "pattern must not be empty" });
    }

    const occurrences = repeated.get(selector.pattern);

    if (occurrences !== undefined && occurrences[0] !== index) {
      diagnostics.push({
        path: patternPath,
        message: `duplicate pattern "${selector.pattern}": two pipelines for one branch`,
      });
    }

    if (selector.pipeline.length === 0) {
      diagnostics.push({
        path: pipelinePath,
        message: "pipeline must contain at least one item",
      });
    } else {
      diagnostics.push(...pipelineProblems(selector.pipeline, pipelinePath));
    }
  }

  return diagnostics;
};

/** A custom variable needs a name and, when declared, a non-empty allowed-values list. */
const variableProblems = (
  variables: readonly CustomVariable[] | undefined,
  base: string,
): readonly Diagnostic[] => {
  if (variables === undefined) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];

  for (const [index, variable] of variables.entries()) {
    const variablePath = `${base}[${index}]`;

    if (variable.name === "") {
      diagnostics.push({
        path: `${variablePath}.name`,
        message: "a custom variable needs a non-empty name",
      });
    }

    if (variable["allowed-values"]?.length === 0) {
      diagnostics.push({
        path: keyPath(variablePath, "allowed-values"),
        message: "a custom variable needs at least one allowed value",
      });
    }
  }

  return diagnostics;
};

/** Custom pipelines: empty and duplicate names, then the same item checks as any other pipeline. */
const customProblems = (entries: readonly NamedPipeline[] | undefined): readonly Diagnostic[] => {
  if (entries === undefined) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];
  const repeated = duplicatesBy(entries, (entry) => entry.name);

  for (const [index, entry] of entries.entries()) {
    const namePath = `$.pipelines.custom[${index}].name`;
    const pipelinePath = `$.pipelines.custom[${index}].pipeline`;

    if (entry.name === "") {
      diagnostics.push({ path: namePath, message: "custom pipeline name must not be empty" });
    }

    diagnostics.push(
      ...variableProblems(entry.variables, `$.pipelines.custom[${index}].variables`),
    );

    const occurrences = repeated.get(entry.name);

    if (occurrences !== undefined && occurrences[0] !== index) {
      diagnostics.push({
        path: namePath,
        message: `duplicate custom pipeline "${entry.name}": two pipelines share one name`,
      });
    }

    if (entry.pipeline.length === 0) {
      diagnostics.push({
        path: pipelinePath,
        message: "pipeline must contain at least one item",
      });
    } else {
      diagnostics.push(...pipelineProblems(entry.pipeline, pipelinePath));
    }
  }

  return diagnostics;
};

/** Labels are author data; the one rule is that a name exists. */
const labelProblems = (config: PipelineConfig): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const key of Object.keys(config.labels ?? {})) {
    if (key === "") {
      diagnostics.push({
        path: keyPath("$.labels", key),
        message: "label key must not be empty",
      });
    }
  }

  return diagnostics;
};

/**
 * Event triggers: every trigger type needs an entry, and every entry a condition and one pipeline
 * name. The type key is author data, so the path names it rather than a fixed position.
 */
const triggerProblems = (triggers: Triggers | undefined): readonly Diagnostic[] => {
  if (triggers === undefined) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];

  for (const [type, entries] of Object.entries(triggers)) {
    const typePath = keyPath("$.triggers", type);

    if (entries.length === 0) {
      diagnostics.push({
        path: typePath,
        message: "trigger type must declare at least one entry",
      });
    }

    for (const [index, trigger] of entries.entries()) {
      const entryPath = `${typePath}[${index}]`;

      if (trigger.condition === "") {
        diagnostics.push({
          path: `${entryPath}.condition`,
          message: "a trigger needs a non-empty condition",
        });
      }

      if (trigger.pipelines.length === 0) {
        diagnostics.push({
          path: `${entryPath}.pipelines`,
          message: "a trigger needs at least one pipeline name",
        });
      }
    }
  }

  return diagnostics;
};

const declaresPipeline = (pipelines: Pipelines): boolean =>
  pipelines.default !== undefined ||
  pipelines.branches !== undefined ||
  pipelines.tags !== undefined ||
  pipelines["pull-requests"] !== undefined ||
  pipelines.custom !== undefined;

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
    ...labelProblems(config),
    ...definitionProblems(config),
    ...defaultProblems(config),
    ...selectorProblems("branches", pipelines.branches),
    ...selectorProblems("tags", pipelines.tags),
    ...selectorProblems("pull-requests", pipelines["pull-requests"]),
    ...customProblems(pipelines.custom),
    ...triggerProblems(config.triggers),
  ];
};
