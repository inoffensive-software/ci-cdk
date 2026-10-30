import { fail, fromValue, map, type Doc, type DocEntry } from "../core/index.js";
import type { Job, Pipeline } from "./types.js";
import { validate } from "./validate.js";

/** Only a declared field with a value is emitted; absent fields are not lowered at all. */
const entry = (key: string, value: Doc | undefined): readonly DocEntry[] =>
  value === undefined ? [] : [{ key, value }];

/** `stage` when set, then `script`. `name` is struct identity and never enters the body. */
const jobDoc = (item: Job): Doc =>
  map([
    ...entry("stage", item.stage === undefined ? undefined : fromValue(item.stage)),
    { key: "script", value: fromValue(item.script) },
  ]);

/**
 * Validates the whole document, then lowers it. `jobs` is an array on the struct so composition is
 * spread and concat; it becomes a map keyed by name here, in array order.
 */
export const toDoc = (pipeline: Pipeline): Doc => {
  const diagnostics = validate(pipeline);

  if (diagnostics.length > 0) {
    fail(...diagnostics);
  }

  return map([
    ...entry("stages", pipeline.stages === undefined ? undefined : fromValue(pipeline.stages)),
    ...pipeline.jobs.map((item) => ({ key: item.name, value: jobDoc(item) })),
  ]);
};
