import type { Text } from "../core/index.js";

/** A literal GitLab accepts as an input value, option or default: no expression, no leaf. */
export type InputLiteral = string | number | boolean;

/** The four input types GitLab documents; an absent `type` means `string`. */
export type JobInputType = "string" | "number" | "boolean" | "array";

/**
 * One typed, validated job input. `default` is required: GitLab refuses a job input without one, so
 * the type states that rather than leaving it to validation. Nothing here is resolved or expanded;
 * the vocabulary only emits the declaration a manual run or retry may override.
 */
export interface JobInput {
  readonly type?: JobInputType;
  /** The allowed values, as literals; GitLab refuses a default outside this list. */
  readonly options?: readonly InputLiteral[];
  /** A pattern a string value must match, in GitLab's regular-expression spelling. */
  readonly regex?: Text;
  readonly description?: Text;
  /** The value used when the run supplies none; scalars, or a list for an `array` input. */
  readonly default: InputLiteral | readonly InputLiteral[];
}

/** An author-named map of input declarations, kept in author order when emitted. */
export type JobInputs = Readonly<Record<string, JobInput>>;
