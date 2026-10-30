import type { Diagnostic } from "../core/index.js";
import type { Job, Pipeline } from "./types.js";

/**
 * A key at the document root that configures the pipeline; a job with one of these names would be
 * read as a setting, so it is refused rather than emitted.
 */
const GLOBAL_KEYWORDS: readonly string[] = [
  "default",
  "include",
  "stages",
  "variables",
  "workflow",
  "spec",
  "image",
  "services",
  "cache",
  "before_script",
  "after_script",
];

/** GitLab runs these two whether or not `stages` lists them, so a job may always name them. */
const IMPLICIT_STAGES: readonly string[] = [".pre", ".post"];

const DEFAULT_STAGES: readonly string[] = [".pre", "build", "test", "deploy", ".post"];

/** A job with no `stage` is assigned GitLab's `test` stage. */
const DEFAULT_STAGE = "test";

const stagePath = (index: number): string => `$.stages[${index}]`;

const jobPath = (index: number): string => `$.jobs[${index}]`;

const namePath = (index: number): string => `${jobPath(index)}.name`;

const scriptPath = (index: number): string => `${jobPath(index)}.script`;

const stageOfPath = (index: number, explicit: boolean): string =>
  explicit ? `${jobPath(index)}.stage` : jobPath(index);

const positionsOf = (values: readonly string[]): ReadonlyMap<string, readonly number[]> => {
  const positions = new Map<string, number[]>();

  for (const [index, value] of values.entries()) {
    const found = positions.get(value);

    if (found === undefined) {
      positions.set(value, [index]);
    } else {
      found.push(index);
    }
  }

  return positions;
};

const duplicateStages = (stages: readonly string[]): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const [stage, indexes] of positionsOf(stages)) {
    if (indexes.length < 2) {
      continue;
    }

    const message = `duplicate stage "${stage}": ${indexes.map((index) => stagePath(index)).join(" and ")}`;

    for (const index of indexes) {
      diagnostics.push({ path: stagePath(index), message });
    }
  }

  return diagnostics;
};

const stageProblems = (pipeline: Pipeline): readonly Diagnostic[] => {
  if (pipeline.stages === undefined) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];

  for (const [index, stage] of pipeline.stages.entries()) {
    if (stage === "") {
      diagnostics.push({ path: stagePath(index), message: "stage name must not be empty" });
    }
  }

  return [...diagnostics, ...duplicateStages(pipeline.stages)];
};

const nameProblem = (name: string): string | undefined => {
  if (name === "") {
    return "job name must not be empty";
  }

  if (GLOBAL_KEYWORDS.includes(name)) {
    return `job name "${name}" is a GitLab global keyword`;
  }

  if (name.startsWith(".")) {
    return `job name "${name}" is a hidden template, not a job`;
  }

  return undefined;
};

const jobNameProblems = (jobs: readonly Job[]): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const [index, item] of jobs.entries()) {
    const message = nameProblem(item.name);

    if (message !== undefined) {
      diagnostics.push({ path: namePath(index), message });
    }
  }

  return diagnostics;
};

const duplicateJobNames = (jobs: readonly Job[]): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const [name, indexes] of positionsOf(jobs.map((item) => item.name))) {
    if (indexes.length < 2) {
      continue;
    }

    const message = `duplicate job name "${name}": ${indexes.map((index) => namePath(index)).join(" and ")}`;

    for (const index of indexes) {
      diagnostics.push({ path: namePath(index), message });
    }
  }

  return diagnostics;
};

const availableStages = (stages: readonly string[] | undefined): ReadonlySet<string> =>
  new Set([...(stages ?? DEFAULT_STAGES), ...IMPLICIT_STAGES]);

const jobStageProblems = (pipeline: Pipeline): readonly Diagnostic[] => {
  const available = availableStages(pipeline.stages);
  const diagnostics: Diagnostic[] = [];

  for (const [index, item] of pipeline.jobs.entries()) {
    const stage = item.stage ?? DEFAULT_STAGE;

    if (available.has(stage)) {
      continue;
    }

    diagnostics.push({
      path: stageOfPath(index, item.stage !== undefined),
      message: `job "${item.name}" uses stage "${stage}", which is not declared`,
    });
  }

  return diagnostics;
};

const scriptProblems = (jobs: readonly Job[]): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const [index, item] of jobs.entries()) {
    if (typeof item.script === "string") {
      if (item.script === "") {
        diagnostics.push({ path: scriptPath(index), message: "script must not be empty" });
      }

      continue;
    }

    if (Array.isArray(item.script) && item.script.length === 0) {
      diagnostics.push({
        path: scriptPath(index),
        message: "script must contain at least one command",
      });
    }
  }

  return diagnostics;
};

/**
 * Whole-document checks. It only collects; `toDoc` is the one place that throws. Membership is
 * checked for explicit and implicit stages alike, so a pipeline that omits `test` from `stages` and
 * from every job's `stage` fails here rather than at pipeline creation.
 */
export const validate = (pipeline: Pipeline): readonly Diagnostic[] => [
  ...stageProblems(pipeline),
  ...jobNameProblems(pipeline.jobs),
  ...duplicateJobNames(pipeline.jobs),
  ...jobStageProblems(pipeline),
  ...scriptProblems(pipeline.jobs),
];
