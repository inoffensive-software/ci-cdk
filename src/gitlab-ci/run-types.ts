import type { Text, Value } from "../core/index.js";

/**
 * One step's environment: names the author chose, each a string that may carry a `${{ }}`
 * expression. Kept as a record so insertion order survives.
 */
export type StepEnv = Readonly<Record<string, Text>>;

/** One step's inputs: names and values the function defines, so the value is author data. */
export type StepInputs = Readonly<Record<string, Value>>;

/** A function reference loaded from a Git repository: the deprecated map form of `func`. */
export interface GitFunction {
  readonly url: Text;
  /** The revision: a branch, tag or commit. */
  readonly rev: Text;
  /** The directory holding `func.yml`, when it is not the repository root. */
  readonly dir?: Text;
  readonly file?: Text;
}

/** A function reference in an OCI registry, the other map form of `func`. */
export interface OciFunction {
  readonly registry: Text;
  readonly repository: Text;
  readonly tag: Text;
  readonly dir?: Text;
  readonly file?: Text;
}

/**
 * A function reference: the documented one-string form, or the map that names its source. GitLab
 * deprecates the Git form but still accepts it, and the corpus pins both.
 */
export type FunctionReference =
  | Text
  | { readonly git: GitFunction }
  | { readonly oci: OciFunction };

/** A step that invokes a function, by its reference string or its source map. */
export interface FunctionStep {
  readonly name: string;
  readonly func: FunctionReference;
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
