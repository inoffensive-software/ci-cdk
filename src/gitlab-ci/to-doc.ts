import {
  fail,
  fromValue,
  map,
  type Diagnostic,
  type Doc,
  type DocEntry,
  type Value,
} from "../core/index.js";
import { rawKeyPath } from "../core/paths.js";
import { lowerRawBlock, rawEntries } from "../core/raw.js";
import type { Job, Pipeline } from "./types.js";
import { validate } from "./validate.js";

/**
 * Job keys that are struct identity or already modelled at this level, so raw may not repeat them.
 * `script` stays reserved even when the job omits it: the field, never `raw`, is how a job carries a
 * script, so a scriptless job cannot smuggle one past validation.
 */
const JOB_RESERVED: readonly string[] = ["name", "stage", "script"];

/** Only a declared field with a value is emitted; absent fields are not lowered at all. */
const entry = (key: string, value: Doc | undefined): readonly DocEntry[] =>
  value === undefined ? [] : [{ key, value }];

/**
 * `stage` when set, then `script` when set, then raw. `name` is struct identity and never enters the
 * body; a job with neither `script` nor `raw` lowers to an empty map, which is the shape a fragment
 * uses to override an included job.
 */
const jobDoc = (item: Job, path: string, diagnostics: Diagnostic[]): Doc => {
  const modelled = [
    ...entry("stage", item.stage === undefined ? undefined : fromValue(item.stage)),
    ...entry("script", item.script === undefined ? undefined : fromValue(item.script)),
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
 * the body. Hidden templates sit between `stages` and the jobs; raw entries come last at each level.
 */
export const toDoc = (pipeline: Pipeline): Doc => {
  const diagnostics: Diagnostic[] = [...validate(pipeline)];

  const modelled = [
    ...entry("stages", pipeline.stages === undefined ? undefined : fromValue(pipeline.stages)),
    ...templateEntries(pipeline.templates, diagnostics),
    ...pipeline.jobs.map((item, index) => ({
      key: item.name,
      value: jobDoc(item, `$.jobs[${index}]`, diagnostics),
    })),
  ];

  const doc = map([
    ...modelled,
    ...rawEntries(
      "$",
      pipeline.raw,
      // Template entries are in `modelled`, so a raw key equal to one collides like any other key.
      modelled,
      diagnostics,
      ["stages", ...pipeline.jobs.map((item) => item.name)],
      rawKeyPath,
    ),
  ]);

  if (diagnostics.length > 0) {
    fail(...diagnostics);
  }

  return doc;
};
