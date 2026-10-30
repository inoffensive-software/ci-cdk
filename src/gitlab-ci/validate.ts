import { duplicatesBy } from "../core/index.js";
import type { Diagnostic } from "../core/index.js";
import type { Job, Pipeline } from "./types.js";

/**
 * A key at the document root that configures the pipeline; a job with one of these names would be
 * read as a setting, so it is refused rather than emitted. The exhaustiveness gate reads the same
 * list to tell a keyword from a job name in the corpus.
 */
export const GLOBAL_KEYWORDS: readonly string[] = [
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

const stagePath = (index: number): string => `$.stages[${index}]`;

const jobPath = (index: number): string => `$.jobs[${index}]`;

const namePath = (index: number): string => `${jobPath(index)}.name`;

const scriptPath = (index: number): string => `${jobPath(index)}.script`;

const duplicateStages = (stages: readonly string[]): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const [stage, indexes] of duplicatesBy(stages, (value) => value)) {
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

  for (const [name, indexes] of duplicatesBy(jobs, (item) => item.name)) {
    const message = `duplicate job name "${name}": ${indexes.map((index) => namePath(index)).join(" and ")}`;

    for (const index of indexes) {
      diagnostics.push({ path: namePath(index), message });
    }
  }

  return diagnostics;
};

const availableStages = (stages: readonly string[] | undefined): ReadonlySet<string> =>
  new Set([...(stages ?? DEFAULT_STAGES), ...IMPLICIT_STAGES]);

/**
 * Only a declared `stage` can be checked. An omitted one is unknowable here: GitLab resolves the
 * merged job, and the stage may come from an `extends` target or from a job the same name defines in
 * an `include`, neither of which is resolved. GitLab's `test` default applies only when nothing else
 * supplies a stage, so diagnosing it would reject fragments that are valid after the merge.
 */
const jobStageProblems = (pipeline: Pipeline): readonly Diagnostic[] => {
  const available = availableStages(pipeline.stages);
  const diagnostics: Diagnostic[] = [];

  for (const [index, item] of pipeline.jobs.entries()) {
    if (item.stage === undefined || available.has(item.stage)) {
      continue;
    }

    diagnostics.push({
      path: `${jobPath(index)}.stage`,
      message: `job "${item.name}" uses stage "${item.stage}", which is not declared`,
    });
  }

  return diagnostics;
};

/**
 * An absent `script` is legal - the job may be overriding an included job of the same name - and
 * emits no key. A declared but empty script is still refused, because it says "no commands" where the
 * author meant "leave it alone".
 */
const scriptProblems = (jobs: readonly Job[]): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  for (const [index, item] of jobs.entries()) {
    if (item.script === undefined) {
      continue;
    }

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
 * Whole-document checks. It only collects; `toDoc` is the one place that throws. Stage membership is
 * checked only where a job declares `stage`: an omitted stage may be supplied by `extends` or by an
 * included job of the same name, and neither is resolved here.
 */
export const validate = (pipeline: Pipeline): readonly Diagnostic[] => [
  ...stageProblems(pipeline),
  ...jobNameProblems(pipeline.jobs),
  ...duplicateJobNames(pipeline.jobs),
  ...jobStageProblems(pipeline),
  ...scriptProblems(pipeline.jobs),
];
