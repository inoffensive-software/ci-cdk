import { entry, fromValue, map, seq, type Diagnostic, type Doc } from "../core/index.js";
import { keyPath, rawKeyPath } from "../core/paths.js";
import { rawEntries } from "../core/raw.js";
import { conditionDoc, finalDoc, stepDoc } from "./step-doc.js";
import type { ParallelItem, PipelineItem, Stage, StepItem } from "./types.js";

/** Keys the stage emits, so raw may not repeat them even when the field is absent. */
const STAGE_RESERVED: readonly string[] = [
  "condition",
  "deployment",
  "environment",
  "name",
  "steps",
  "trigger",
];

const isParallelMap = (
  value: ParallelItem["parallel"],
): value is { readonly steps: readonly StepItem[]; readonly "fail-fast"?: boolean } =>
  !Array.isArray(value);

const stepSeq = (steps: readonly StepItem[], base: string, diagnostics: Diagnostic[]): Doc =>
  seq(steps.map((item, index) => itemDoc(item, `${base}[${index}]`, diagnostics)));

/** A parallel group: a bare sequence, or the `fail-fast` then `steps` map. */
const parallelDoc = (
  value: ParallelItem["parallel"],
  groupPath: string,
  diagnostics: Diagnostic[],
): Doc =>
  isParallelMap(value)
    ? map([
        ...entry(
          "fail-fast",
          value["fail-fast"] === undefined ? undefined : fromValue(value["fail-fast"]),
        ),
        { key: "steps", value: stepSeq(value.steps, `${groupPath}.steps`, diagnostics) },
      ])
    : stepSeq(value, groupPath, diagnostics);

/** A stage: `condition`, `deployment`, `environment`, `name`, `steps`, `trigger`, then raw. */
const stageDoc = (stage: Stage, stagePath: string, diagnostics: Diagnostic[]): Doc => {
  const modelled = [
    ...entry(
      "condition",
      stage.condition === undefined ? undefined : conditionDoc(stage.condition),
    ),
    ...entry(
      "deployment",
      stage.deployment === undefined ? undefined : fromValue(stage.deployment),
    ),
    ...entry(
      "environment",
      stage.environment === undefined ? undefined : fromValue(stage.environment),
    ),
    ...entry("name", stage.name === undefined ? undefined : fromValue(stage.name)),
    { key: "steps", value: stepSeq(stage.steps, `${stagePath}.steps`, diagnostics) },
    ...entry("trigger", stage.trigger === undefined ? undefined : fromValue(stage.trigger)),
  ];

  return map([
    ...modelled,
    ...rawEntries(stagePath, stage.raw, modelled, diagnostics, STAGE_RESERVED, rawKeyPath),
  ]);
};

/** An item is a one-key map: `step`, `parallel`, `stage` or `final`. */
export const itemDoc = (item: PipelineItem, itemPath: string, diagnostics: Diagnostic[]): Doc => {
  if ("step" in item) {
    return map([{ key: "step", value: stepDoc(item, itemPath, diagnostics) }]);
  }

  if ("parallel" in item) {
    return map([
      {
        key: "parallel",
        value: parallelDoc(item.parallel, keyPath(itemPath, "parallel"), diagnostics),
      },
    ]);
  }

  if ("stage" in item) {
    return map([
      { key: "stage", value: stageDoc(item.stage, keyPath(itemPath, "stage"), diagnostics) },
    ]);
  }

  return map([{ key: "final", value: finalDoc(item, itemPath, diagnostics) }]);
};
