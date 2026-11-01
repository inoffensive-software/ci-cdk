import {
  entry,
  fail,
  fromValue,
  map,
  present,
  type Diagnostic,
  type Doc,
  type DocEntry,
  type Value,
} from "../core/index.js";
import { rawKeyPath } from "../core/paths.js";
import { lowerRawBlock, rawEntries } from "../core/raw.js";
import {
  artifactsDoc,
  cacheDoc,
  dastConfigurationDoc,
  defaultDoc,
  hooksDoc,
  includeDoc,
  inheritDoc,
  needsDoc,
  pagesDoc,
  retryDoc,
  rulesDoc,
  workflowDoc,
} from "./blocks.js";
import {
  allowFailureDoc,
  environmentDoc,
  parallelDoc,
  releaseDoc,
  triggerDoc,
} from "./delivery-blocks.js";
import { secretsDoc } from "./secrets-blocks.js";
import { stepsDoc } from "./run-blocks.js";
import { imageDoc, servicesDoc } from "./runtime-blocks.js";
import { jobInputsDoc } from "./input-blocks.js";
import { variablesDoc } from "./nesting-blocks.js";
import { idTokensDoc } from "./token-blocks.js";
import type { Job, Pipeline } from "./types.js";
import { validate } from "./validate.js";

/**
 * Global keys that are modelled here, so raw may not repeat them. They stay reserved when the
 * pipeline omits them: the field, never `raw`, is how the DSL carries the keyword, so an absent
 * `default` cannot be smuggled in through the escape hatch.
 */
const PIPELINE_RESERVED: readonly string[] = [
  "default",
  "include",
  "stages",
  "variables",
  "workflow",
];

/**
 * Job keys that are struct identity or modelled at this level, so raw may not repeat them. Every
 * one stays reserved even when the job omits it: the field, never `raw`, is how a job carries the
 * keyword, so an absent one cannot be smuggled in through the escape hatch.
 */
const JOB_RESERVED: readonly string[] = [
  "name",
  "stage",
  "extends",
  "needs",
  "rules",
  "tags",
  "image",
  "services",
  "variables",
  "inherit",
  "secrets",
  "id_tokens",
  "identity",
  "cache",
  "artifacts",
  "pages",
  "dependencies",
  "hooks",
  "start_in",
  "manual_confirmation",
  "dast_configuration",
  "inputs",
  "before_script",
  "script",
  "run",
  "after_script",
  "environment",
  "release",
  "trigger",
  "parallel",
  "retry",
  "timeout",
  "interruptible",
  "allow_failure",
  "when",
  "resource_group",
  "coverage",
];

/** An absent field emits no entry; a present one crosses its shape's own lowering. */
const whenPresent = <T>(value: T | undefined, doc: (item: T) => Doc): Doc | undefined =>
  value === undefined ? undefined : doc(value);

/**
 * A job's body in the spec's fixed order. Absent fields emit nothing, so a fragment stays a fragment;
 * a job with none of them lowers to an empty map.
 */
const jobDoc = (item: Job, path: string, diagnostics: Diagnostic[]): Doc => {
  const modelled = [
    ...entry("stage", item.stage === undefined ? undefined : fromValue(item.stage)),
    ...entry("extends", present(item.extends)),
    ...entry("needs", whenPresent(item.needs, needsDoc)),
    ...entry("rules", whenPresent(item.rules, rulesDoc)),
    ...entry("tags", present(item.tags)),
    ...entry("image", whenPresent(item.image, imageDoc)),
    ...entry("services", whenPresent(item.services, servicesDoc)),
    ...entry("variables", whenPresent(item.variables, variablesDoc)),
    ...entry("inherit", whenPresent(item.inherit, inheritDoc)),
    ...entry("secrets", whenPresent(item.secrets, secretsDoc)),
    ...entry("id_tokens", whenPresent(item.id_tokens, idTokensDoc)),
    ...entry("identity", present(item.identity)),
    ...entry("cache", whenPresent(item.cache, cacheDoc)),
    ...entry("artifacts", whenPresent(item.artifacts, artifactsDoc)),
    ...entry("pages", whenPresent(item.pages, pagesDoc)),
    ...entry("dependencies", present(item.dependencies)),
    ...entry("hooks", whenPresent(item.hooks, hooksDoc)),
    ...entry("dast_configuration", whenPresent(item.dast_configuration, dastConfigurationDoc)),
    ...entry("inputs", whenPresent(item.inputs, jobInputsDoc)),
    ...entry("before_script", present(item.before_script)),
    ...entry("script", present(item.script)),
    ...entry("run", whenPresent(item.run, stepsDoc)),
    ...entry("after_script", present(item.after_script)),
    ...entry("environment", whenPresent(item.environment, environmentDoc)),
    ...entry("release", whenPresent(item.release, releaseDoc)),
    ...entry("trigger", whenPresent(item.trigger, triggerDoc)),
    ...entry("parallel", whenPresent(item.parallel, parallelDoc)),
    ...entry("retry", whenPresent(item.retry, retryDoc)),
    ...entry("timeout", present(item.timeout)),
    ...entry("interruptible", present(item.interruptible)),
    ...entry("allow_failure", whenPresent(item.allow_failure, allowFailureDoc)),
    ...entry("when", present(item.when)),
    ...entry("start_in", present(item.start_in)),
    ...entry("manual_confirmation", present(item.manual_confirmation)),
    ...entry("resource_group", present(item.resource_group)),
    ...entry("coverage", present(item.coverage)),
  ];

  return map([
    ...modelled,
    ...rawEntries(path, item.raw, modelled, diagnostics, JOB_RESERVED, rawKeyPath),
  ]);
};

/**
 * Hidden jobs and anchor-only entries. They lower as plain data and keep record order; a key without
 * the leading dot would emit a second runnable entry at the document root, so it is refused.
 */
const templateEntries = (
  templates: Readonly<Record<string, Value>> | undefined,
  diagnostics: Diagnostic[],
): readonly DocEntry[] => {
  if (templates === undefined) {
    return [];
  }

  return lowerRawBlock(templates, "$.templates", diagnostics).flatMap((item) => {
    if (item.key.startsWith(".")) {
      return [item];
    }

    diagnostics.push({
      path: `$.templates[${JSON.stringify(item.key)}]`,
      message: `template key "${item.key}" must start with "."`,
      hint: 'prefix the name with a dot, or write it as a job in "jobs"',
    });

    return [];
  });
};

/**
 * Validates the whole document, then lowers it. `jobs` is an array on the struct so composition is
 * spread and concat; it becomes a map keyed by name here, in array order, with `name` stripped from
 * the body. The global keys keep the spec's fixed order, the hidden templates sit between
 * `workflow` and the jobs, and raw entries come last at each level.
 */
export const toDoc = (pipeline: Pipeline): Doc => {
  const diagnostics: Diagnostic[] = [...validate(pipeline)];

  const modelled = [
    ...entry("default", pipeline.default === undefined ? undefined : defaultDoc(pipeline.default)),
    ...entry("include", pipeline.include === undefined ? undefined : includeDoc(pipeline.include)),
    ...entry("stages", pipeline.stages === undefined ? undefined : fromValue(pipeline.stages)),
    ...entry(
      "variables",
      pipeline.variables === undefined ? undefined : variablesDoc(pipeline.variables),
    ),
    ...entry(
      "workflow",
      pipeline.workflow === undefined ? undefined : workflowDoc(pipeline.workflow),
    ),
    ...templateEntries(pipeline.templates, diagnostics),
    ...pipeline.jobs.map((item, index) => ({
      key: item.name,
      value: jobDoc(item, `$.jobs[${index}]`, diagnostics),
    })),
  ];

  const doc = map([
    ...modelled,
    ...rawEntries("$", pipeline.raw, modelled, diagnostics, PIPELINE_RESERVED, rawKeyPath),
  ]);

  if (diagnostics.length > 0) {
    fail(...diagnostics);
  }

  return doc;
};
