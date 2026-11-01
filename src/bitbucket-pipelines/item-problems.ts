import type { Diagnostic } from "../core/index.js";
import { keyPath } from "../core/paths.js";
import type {
  Artifacts,
  FinalItem,
  ParallelItem,
  PipelineItem,
  Pipe,
  ScriptItem,
  Step,
  StepItem,
} from "./types.js";

const isPipe = (item: ScriptItem): item is Pipe => typeof item !== "string" && "pipe" in item;

const isArtifactsMap = (artifacts: Artifacts): artifacts is Exclude<Artifacts, readonly string[]> =>
  !Array.isArray(artifacts);

const isParallelMap = (
  value: ParallelItem["parallel"],
): value is { readonly steps: readonly StepItem[]; readonly "fail-fast"?: boolean } =>
  !Array.isArray(value);

const conditionProblems = (body: Step, stepPath: string): readonly Diagnostic[] => {
  const changesets = body.condition?.changesets;

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

/** An upload is a named capture, so it needs a name and at least one path. */
const artifactsProblems = (artifacts: Artifacts, artifactsPath: string): readonly Diagnostic[] => {
  if (!isArtifactsMap(artifacts) || artifacts.upload === undefined) {
    return [];
  }

  const diagnostics: Diagnostic[] = [];

  for (const [index, upload] of artifacts.upload.entries()) {
    const uploadPath = `${artifactsPath}.upload[${index}]`;

    if (upload.name === "") {
      diagnostics.push({
        path: `${uploadPath}.name`,
        message: "an artifact upload needs a non-empty name",
      });
    }

    if (upload.paths.length === 0) {
      diagnostics.push({
        path: `${uploadPath}.paths`,
        message: "an artifact upload needs at least one path",
      });
    }

    if (upload.depth !== undefined && upload.depth < 1) {
      diagnostics.push({
        path: `${uploadPath}.depth`,
        message: "an artifact upload needs a depth of at least 1",
      });
    }
  }

  return diagnostics;
};

/**
 * The properties Bitbucket rejects on a child pipeline step. `script` is not one of them: a child
 * step may omit it, and validation only asks an inline step for one.
 */
const CHILD_FORBIDDEN = [
  "caches",
  "clone",
  "deployment",
  "image",
  "oidc",
  "output-variables",
  "runs-on",
  "runtime",
  "services",
  "size",
  "trigger",
] as const;

/**
 * A child pipeline step: a `custom` target and nothing Bitbucket refuses beside it. The custom
 * target is required because a `type: pipeline` step without one names no pipeline to run.
 */
const childProblems = (body: Step, bodyPath: string): readonly Diagnostic[] => {
  if (body.type !== "pipeline") {
    return [];
  }

  const diagnostics: Diagnostic[] = [];

  if (body.custom === undefined || body.custom === "") {
    diagnostics.push({
      path: `${bodyPath}.custom`,
      message: "a child pipeline step needs a non-empty custom pipeline name",
    });
  }

  for (const property of CHILD_FORBIDDEN) {
    if (body[property] !== undefined) {
      diagnostics.push({
        path: bodyPath,
        message: `a child pipeline step cannot set "${property}"`,
      });
    }
  }

  return diagnostics;
};

/** A script sequence: required on an inline step, optional on a child pipeline step. */
const scriptProblems = (body: Step, bodyPath: string): readonly Diagnostic[] => {
  const scriptPath = `${bodyPath}.script`;
  const diagnostics: Diagnostic[] = [];

  if (body.type !== "pipeline" && (body.script === undefined || body.script.length === 0)) {
    diagnostics.push({
      path: scriptPath,
      message: "script must contain at least one command",
    });
  }

  for (const [scriptIndex, scriptItem] of (body.script ?? []).entries()) {
    if (isPipe(scriptItem) && scriptItem.pipe === "") {
      diagnostics.push({
        path: `${scriptPath}[${scriptIndex}].pipe`,
        message: "pipe must not be empty",
      });
    }
  }

  return diagnostics;
};

/** A step body, wherever it sits: `...step`, `...final`, a stage or a parallel group. */
const bodyProblems = (body: Step, bodyPath: string): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [
    ...scriptProblems(body, bodyPath),
    ...childProblems(body, bodyPath),
  ];

  if (body.artifacts !== undefined) {
    diagnostics.push(...artifactsProblems(body.artifacts, `${bodyPath}.artifacts`));
  }

  if (body.auth?.system?.scopes?.length === 0) {
    diagnostics.push({
      path: `${bodyPath}.auth.system.scopes`,
      message: "step auth needs at least one scope",
    });
  }

  diagnostics.push(...conditionProblems(body, bodyPath));

  return diagnostics;
};

/** A parallel group: an empty group at `...parallel`, children at the shape they were written in. */
const parallelProblems = (
  value: ParallelItem["parallel"],
  groupPath: string,
): readonly Diagnostic[] => {
  const map = isParallelMap(value);
  const steps = map ? value.steps : value;
  const base = map ? `${groupPath}.steps` : groupPath;

  return [
    ...(steps.length === 0
      ? [{ path: groupPath, message: "parallel must contain at least one step" }]
      : itemProblems(steps, base)),
  ];
};

/** Position rules and body checks for one final item. */
const finalProblems = (
  item: FinalItem,
  itemPath: string,
  index: number,
  count: number,
  total: number,
): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];

  if (count > 1) {
    diagnostics.push({ path: itemPath, message: "a pipeline allows one final step" });
  }

  if (index !== total - 1) {
    diagnostics.push({ path: itemPath, message: "the final step must be the last item" });
  }

  if (total === 1) {
    diagnostics.push({
      path: itemPath,
      message: "the final step needs at least one step before it",
    });
  }

  diagnostics.push(...bodyProblems(item.final, keyPath(itemPath, "final")));

  return diagnostics;
};

/** Every item is walked, whatever its form: container checks first, then the bodies inside. */
const itemProblems = (items: readonly PipelineItem[], base: string): readonly Diagnostic[] => {
  const diagnostics: Diagnostic[] = [];
  let finals = 0;

  for (const [index, item] of items.entries()) {
    const itemPath = `${base}[${index}]`;

    if ("step" in item) {
      diagnostics.push(...bodyProblems(item.step, keyPath(itemPath, "step")));
    } else if ("parallel" in item) {
      diagnostics.push(...parallelProblems(item.parallel, keyPath(itemPath, "parallel")));
    } else if ("stage" in item) {
      const stagePath = keyPath(itemPath, "stage");
      const stepsPath = `${stagePath}.steps`;

      if (item.stage.steps.length === 0) {
        diagnostics.push({ path: stepsPath, message: "stage must contain at least one step" });
      }

      diagnostics.push(...itemProblems(item.stage.steps, stepsPath));
    } else {
      finals += 1;
      diagnostics.push(...finalProblems(item, itemPath, index, finals, items.length));
    }
  }

  return diagnostics;
};

/** Checks every item and body a pipeline or a definitions group contains. */
export const pipelineProblems = (
  items: readonly PipelineItem[],
  base: string,
): readonly Diagnostic[] => itemProblems(items, base);
