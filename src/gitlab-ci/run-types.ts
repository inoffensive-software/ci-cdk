import type { Text, Value } from "../core/index.js";

/**
 * One step's environment: names the author chose, each a string that may carry a `${{ }}`
 * expression. Kept as a record so insertion order survives.
 */
export type StepEnv = Readonly<Record<string, Text>>;

/** One step's inputs: names and values the function defines, so the value is author data. */
export type StepInputs = Readonly<Record<string, Value>>;

/** A step that invokes a function, by its reference string. */
export interface FunctionStep {
  readonly name: string;
  readonly func: Text;
  readonly inputs?: StepInputs;
  readonly env?: StepEnv;
}

/** A step that runs an inline shell script, GitLab's escape hatch alongside functions. */
export interface ScriptStep {
  readonly name: string;
  readonly script: Text;
  readonly env?: StepEnv;
}

/**
 * One entry of `run`. GitLab requires `name` and exactly one of `func` or `script`; the union makes
 * that exclusive pair unrepresentable rather than a runtime check. Step names are GitLab
 * identifiers, validated in `validate`.
 */
export type Step = FunctionStep | ScriptStep;
