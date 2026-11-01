import type { Scalar, Text } from "../core/index.js";
import type { Artifacts, CacheList, Hooks, Image, Retry, Rule, Script, Service } from "./types.js";
import type { Identity, IdTokens } from "./token-types.js";

/**
 * One input value supplied to an included or triggered configuration. GitLab documents the scalar
 * form; the pinned schema also admits a list and a map, so the object form carries a value with the
 * expansion switch and the same descriptive keys a variable may have. Nothing here is resolved or
 * validated against the target's `spec:inputs`.
 */
export interface InputOptions {
  readonly value: Scalar;
  readonly expand?: boolean;
  readonly options?: readonly Scalar[];
  readonly description?: Text;
}

/** A scalar, a list of values, or the object form. Lists and maps nest, as the schema allows. */
export type InputValue = Scalar | readonly InputValue[] | InputOptions;

/** An author-named map of input values, kept in author order when emitted. */
export type Inputs = Readonly<Record<string, InputValue>>;

/** The fields every include entry may carry; the discriminator decides the source. */
export interface IncludeOptions {
  readonly rules?: readonly Rule[];
  readonly integrity?: Text;
  readonly inputs?: Inputs;
}

export type IncludeEntry =
  | (IncludeOptions & { readonly local: Text })
  /** Only a remote include caches: `true` takes the default hour, a duration string the rest. */
  | (IncludeOptions & { readonly remote: Text; readonly cache?: boolean | Text })
  | (IncludeOptions & { readonly template: Text })
  | (IncludeOptions & {
      readonly project: Text;
      readonly ref?: Text;
      readonly file: Text | readonly Text[];
    })
  | (IncludeOptions & { readonly component: Text });

/** One include entry, or several; GitLab accepts either shape. Entries are never resolved. */
export type Include = IncludeEntry | readonly IncludeEntry[];

export interface AutoCancel {
  readonly on_new_commit?: "conservative" | "interruptible" | "none";
  readonly on_job_failure?: "all" | "none";
}

/** The pipeline gate: a name, auto-cancel policy, and the rules that decide whether it runs. */
export interface Workflow {
  readonly name?: Text;
  readonly auto_cancel?: AutoCancel;
  readonly rules?: readonly Rule[];
}

/**
 * The pipeline-wide defaults this slice models. GitLab applies them to a job at pipeline creation;
 * the DSL only emits them, and never merges them into a job.
 */
export interface Default {
  readonly image?: Image;
  readonly services?: readonly Service[];
  readonly tags?: readonly string[];
  readonly before_script?: Script;
  readonly after_script?: Script;
  readonly cache?: CacheList;
  readonly artifacts?: Artifacts;
  readonly retry?: Retry;
  readonly timeout?: Text;
  readonly interruptible?: boolean;
  readonly hooks?: Hooks;
  readonly id_tokens?: IdTokens;
  readonly identity?: Identity;
}
