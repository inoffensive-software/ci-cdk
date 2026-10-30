import type { LeafNode, Text, Value } from "../core/index.js";

/**
 * An arbitrary YAML scalar, for maps whose keys the author chooses. Wider than `Text` because GitLab
 * keeps `FF_NETWORK_PER_BUILD: 1` and `STABLE_VERSION: "1.5"` distinct: a quoted number is a different
 * value to the job that reads it (ADR 0010).
 */
export type Scalar = string | number | boolean | LeafNode;

/**
 * A job's commands, in GitLab's own spelling: one string, one leaf that decides its own style, or an
 * ordered list of them. No literal block is produced; a block scalar would add a trailing newline and
 * change the parsed value.
 */
export type Script = Text | readonly Text[];

/** The closed set GitLab documents for a job's run condition. */
export type When = "on_success" | "on_failure" | "always" | "never" | "manual" | "delayed";

/** The three statuses `cache:when` and `artifacts:when` accept; narrower than `When`. */
export type OnStatus = "on_success" | "on_failure" | "always";

/** The closed set GitLab documents for `image:pull_policy`. */
export type ImagePullPolicy = "always" | "if-not-present" | "never";

/** An image with a cleared entrypoint, a pull policy, or both. */
export interface ImageOptions {
  readonly name: Text;
  readonly entrypoint?: readonly Text[];
  readonly pull_policy?: ImagePullPolicy;
}

/** A Docker image, as its name or as the map GitLab also accepts. */
export type Image = Text | ImageOptions;

/** A linked service container, as its name or as the map GitLab also accepts. */
export interface ServiceOptions {
  readonly name: Text;
  readonly alias?: Text;
  readonly entrypoint?: readonly Text[];
  readonly command?: readonly Text[];
  readonly variables?: Readonly<Record<string, Scalar>>;
}

export type Service = Text | ServiceOptions;

/** The `files`/`prefix` form of `cache:key`; a plain `Text` key is the other form. */
export interface CacheKeyFiles {
  readonly files: readonly string[];
  readonly prefix?: Text;
}

export interface Cache {
  readonly key?: Text | CacheKeyFiles;
  readonly paths: readonly string[];
  readonly policy?: "pull" | "push" | "pull-push";
  readonly when?: OnStatus;
  readonly fallback_keys?: readonly string[];
  readonly untracked?: boolean;
}

/** One cache, or several; GitLab accepts either shape wherever `cache` is written. */
export type CacheList = Cache | readonly Cache[];

export interface Artifacts {
  readonly paths?: readonly string[];
  readonly exclude?: readonly string[];
  readonly name?: Text;
  readonly expire_in?: Text;
  readonly expose_as?: Text;
  readonly public?: boolean;
  readonly when?: OnStatus;
  /** Report names are the author's, so the map keeps insertion order. */
  readonly reports?: Readonly<Record<string, readonly string[]>>;
}

export interface RetryOptions {
  readonly max: number;
  readonly when?: readonly string[];
  readonly exit_codes?: readonly number[];
}

/** A retry count, or the map with `when` conditions and `exit_codes`. */
export type Retry = number | RetryOptions;

/** The `paths`/`compare_to` form of `rules:changes`. */
export interface Changes {
  readonly paths: readonly string[];
  readonly compare_to?: Text;
}

/**
 * One ordered condition. `needs` arrives with ticket 41, which also attaches `rules` to a job; the
 * fields here are the ones `workflow` and `include` already accept.
 */
export interface Rule {
  readonly if?: Text;
  readonly changes?: Changes;
  readonly exists?: readonly string[];
  readonly when?: When;
  readonly allow_failure?: boolean;
  readonly variables?: Readonly<Record<string, Scalar>>;
}

/** The fields every include entry may carry; the discriminator decides the source. */
export interface IncludeOptions {
  readonly rules?: readonly Rule[];
  readonly integrity?: Text;
}

export type IncludeEntry =
  | (IncludeOptions & { readonly local: Text })
  | (IncludeOptions & { readonly remote: Text })
  | (IncludeOptions & { readonly template: Text })
  | (IncludeOptions & {
      readonly project: Text;
      readonly ref?: Text;
      readonly file: Text | readonly Text[];
    })
  | (IncludeOptions & {
      readonly component: Text;
      readonly inputs?: Readonly<Record<string, Scalar>>;
    });

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
}

/**
 * A named job. `name` is the map key in the output and never appears in the job body.
 *
 * `script` is optional because a file may be a fragment: GitLab merges included jobs by name, so a
 * job here can override `rules`, `needs` or a matrix and leave `script` to the job it merges with. An
 * absent `script` emits no key at all; an empty string or array is still refused.
 */
export interface Job {
  readonly name: string;
  readonly stage?: string;
  readonly variables?: Readonly<Record<string, Scalar>>;
  readonly script?: Script;
  /** Job keywords the vocabulary does not model, appended after the modelled keys. */
  readonly raw?: Readonly<Record<string, Value>>;
}

/**
 * The pipeline-level vocabulary. Emission order is fixed by the spec and independent of the order
 * the struct is written in: `default`, `include`, `stages`, `variables`, `workflow`, the templates,
 * the jobs, then `raw`.
 */
export interface Pipeline {
  readonly default?: Default;
  readonly include?: Include;
  readonly stages?: readonly string[];
  readonly variables?: Readonly<Record<string, Scalar>>;
  readonly workflow?: Workflow;
  /**
   * Hidden jobs and anchor-only entries: author data, not vocabulary. Every key must start with `.`
   * and is emitted at the document root, before the job entries, in record order. Values are plain
   * data of any shape and are never validated or resolved.
   */
  readonly templates?: Readonly<Record<string, Value>>;
  readonly jobs: readonly Job[];
  /** Global keywords the vocabulary does not model, appended last at the document root. */
  readonly raw?: Readonly<Record<string, Value>>;
}

/**
 * Builders are near-identity inference anchors: they pin the type and return the input itself, so a
 * call can never throw, default, merge or clone.
 */
export const pipeline = (value: Pipeline): Pipeline => value;

export const job = (value: Job): Job => value;
