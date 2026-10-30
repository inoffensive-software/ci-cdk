import { fail, fromValue, map, type Diagnostic, type Doc, type DocEntry } from "../core/index.js";
import { rawKeyPath } from "../core/paths.js";
import { rawEntries } from "../core/raw.js";
import type { Job, Pipeline } from "./types.js";
import { validate } from "./validate.js";

/** Job keys that are struct identity or already modelled at this level, so raw may not repeat them. */
const JOB_RESERVED: readonly string[] = ["name", "stage", "script"];

/** Only a declared field with a value is emitted; absent fields are not lowered at all. */
const entry = (key: string, value: Doc | undefined): readonly DocEntry[] =>
  value === undefined ? [] : [{ key, value }];

/** `stage` when set, then `script`, then raw. `name` is struct identity and never enters the body. */
const jobDoc = (item: Job, path: string, diagnostics: Diagnostic[]): Doc => {
  const modelled = [
    ...entry("stage", item.stage === undefined ? undefined : fromValue(item.stage)),
    { key: "script", value: fromValue(item.script) },
  ];

  return map([
    ...modelled,
    ...rawEntries(path, item.raw, modelled, diagnostics, JOB_RESERVED, rawKeyPath),
  ]);
};

/**
 * Validates the whole document, then lowers it. `jobs` is an array on the struct so composition is
 * spread and concat; it becomes a map keyed by name here, in array order, with `name` stripped from
 * the body. Raw entries come last at each level.
 */
export const toDoc = (pipeline: Pipeline): Doc => {
  const diagnostics: Diagnostic[] = [...validate(pipeline)];

  const modelled = [
    ...entry("stages", pipeline.stages === undefined ? undefined : fromValue(pipeline.stages)),
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
