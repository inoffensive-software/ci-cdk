import type { Diagnostic } from "../core/index.js";
import type { PipelineConfig, PipelineItem, Pipe, ScriptItem } from "./types.js";

const DEFAULT_PATH = "$.pipelines.default";

const branchPath = (index: number): string => `$.pipelines.branches[${index}]`;

const patternPath = (index: number): string => `${branchPath(index)}.pattern`;

const branchPipelinePath = (index: number): string => `${branchPath(index)}.pipeline`;

const isPipe = (item: ScriptItem): item is Pipe => typeof item !== "string" && "pipe" in item;

const stepProblems = (items: readonly PipelineItem[], base: string): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const [index, item] of items.entries()) {
    const scriptPath = `${base}[${index}].step.script`;

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
  }

  return diagnostics;
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

const branchProblems = (config: PipelineConfig): readonly Diagnostic[] => {
  const branches = config.pipelines.branches;

  if (branches === undefined) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];
  const seen = new Set<string>();

  for (const [index, branch] of branches.entries()) {
    if (branch.pattern === "") {
      diagnostics.push({ path: patternPath(index), message: "pattern must not be empty" });
    }

    if (seen.has(branch.pattern)) {
      diagnostics.push({
        path: patternPath(index),
        message: `duplicate pattern "${branch.pattern}": two pipelines for one branch`,
      });
    } else {
      seen.add(branch.pattern);
    }

    if (branch.pipeline.length === 0) {
      diagnostics.push({
        path: branchPipelinePath(index),
        message: "pipeline must contain at least one item",
      });
    } else {
      diagnostics.push(...stepProblems(branch.pipeline, branchPipelinePath(index)));
    }
  }

  return diagnostics;
};

/**
 * Whole-document checks. It only collects; `toDoc` is the one place that throws. Raw collisions are
 * found while lowering, because they depend on what the modelled keys emit, so they are not here.
 */
export const validate = (config: PipelineConfig): readonly Diagnostic[] => {
  const { pipelines } = config;
  const declared = pipelines.default !== undefined || pipelines.branches !== undefined;

  const diagnostics: Diagnostic[] = declared
    ? []
    : [{ path: "$.pipelines", message: "pipelines must declare at least one pipeline" }];

  return [...diagnostics, ...defaultProblems(config), ...branchProblems(config)];
};
