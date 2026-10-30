import {
  fail,
  fromValue,
  map,
  type Diagnostic,
  type Doc,
  type DocEntry,
  type Text,
  type Value,
} from "../core/index.js";
import { rawKeyPath } from "../core/paths.js";
import { lowerRawBlock, rawEntries } from "../core/raw.js";
import {
  artifactsDoc,
  cacheDoc,
  defaultDoc,
  imageDoc,
  includeDoc,
  servicesDoc,
  variablesDoc,
  workflowDoc,
} from "./blocks.js";
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
  "tags",
  "image",
  "services",
  "variables",
  "cache",
  "artifacts",
  "before_script",
  "script",
  "after_script",
];

/** Only a declared field with a value is emitted; absent fields are not lowered at all. */
const entry = (key: string, value: Doc | undefined): readonly DocEntry[] =>
  value === undefined ? [] : [{ key, value }];

const present = (value: Text | readonly Text[] | undefined): Doc | undefined =>
  value === undefined ? undefined : fromValue(value);

/**
 * A job's body in the spec's fixed order. Absent fields emit nothing, so a fragment stays a fragment;
 * a job with none of them lowers to an empty map.
 */
const jobDoc = (item: Job, path: string, diagnostics: Diagnostic[]): Doc => {
  const modelled = [
    ...entry("stage", item.stage === undefined ? undefined : fromValue(item.stage)),
    ...entry("extends", present(item.extends)),
    ...entry("tags", present(item.tags)),
    ...entry("image", item.image === undefined ? undefined : imageDoc(item.image)),
    ...entry("services", item.services === undefined ? undefined : servicesDoc(item.services)),
    ...entry("variables", item.variables === undefined ? undefined : variablesDoc(item.variables)),
    ...entry("cache", item.cache === undefined ? undefined : cacheDoc(item.cache)),
    ...entry("artifacts", item.artifacts === undefined ? undefined : artifactsDoc(item.artifacts)),
    ...entry("before_script", present(item.before_script)),
    ...entry("script", present(item.script)),
    ...entry("after_script", present(item.after_script)),
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
