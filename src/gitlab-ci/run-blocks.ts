import { entry, fromValue, map, seq, type Doc, type DocEntry, type Text } from "../core/index.js";
import type { Step } from "./run-types.js";

/** A function step carries `inputs`; a script step does not, so the two lower separately. */
const functionStepEntries = (step: Extract<Step, { readonly func: Text }>): readonly DocEntry[] => [
  { key: "name", value: fromValue(step.name) },
  { key: "func", value: fromValue(step.func) },
  ...entry("inputs", step.inputs === undefined ? undefined : fromValue(step.inputs)),
  ...entry("env", step.env === undefined ? undefined : fromValue(step.env)),
];

const scriptStepEntries = (step: Extract<Step, { readonly script: Text }>): readonly DocEntry[] => [
  { key: "name", value: fromValue(step.name) },
  { key: "script", value: fromValue(step.script) },
  ...entry("env", step.env === undefined ? undefined : fromValue(step.env)),
];

/**
 * One `run` entry, in the docs' order: `name`, then the function or script, then `inputs` and
 * `env`. The union is the discriminator, so a step is never emitted with both.
 */
export const stepsDoc = (steps: readonly Step[]): Doc =>
  seq(
    steps.map((step) => map("func" in step ? functionStepEntries(step) : scriptStepEntries(step))),
  );
