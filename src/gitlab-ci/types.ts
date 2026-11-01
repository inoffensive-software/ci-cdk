import type { Scalar, Text, Value } from "../core/index.js";
import type { DastConfiguration, Hooks, Inherit } from "./deferred-types.js";
import type { Default, Include, Workflow } from "./pipeline-types.js";
import type { Trigger } from "./trigger-types.js";
import type { Secret } from "./secret-types.js";

export type { DastConfiguration, Hooks, Inherit } from "./deferred-types.js";

export type {
  AutoCancel,
  Default,
  Include,
  IncludeEntry,
  IncludeOptions,
  Workflow,
} from "./pipeline-types.js";

/**
 * An arbitrary YAML scalar, for maps whose keys the author chooses. The type lives in core because
 * every provider needs the same alias; this module re-exports it so the provider's other files keep
 * one import site.
 */
export type { Scalar };

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
  /**
   * Report names are the author's, so the map keeps insertion order. GitLab accepts one path or a
   * list of them, so both stay expressible; flattening a single path into a list would change the
   * value the provider reads.
   */
  readonly reports?: Readonly<Record<string, Text | readonly Text[]>>;
}

export interface RetryOptions {
  readonly max: number;
  readonly when?: readonly string[];
  readonly exit_codes?: number | readonly number[];
}

/** A retry count, or the map with `when` conditions and `exit_codes`. */
export type Retry = number | RetryOptions;

/** The map form of `environment`: a deployment target with its URL and lifecycle hooks. */
export interface EnvironmentOptions {
  readonly name: Text;
  readonly url?: Text;
  readonly action?: "start" | "prepare" | "stop" | "verify" | "access";
  readonly on_stop?: Text;
  readonly auto_stop_in?: Text;
  readonly deployment_tier?: Text;
}

/** A deployment environment, as its name or as the map GitLab also accepts. */
export type Environment = Text | EnvironmentOptions;

/** The metadata a job hands to GitLab's release API. */
export interface Release {
  readonly tag_name: Text;
  readonly description: Text;
  readonly name?: Text;
  readonly ref?: Text;
  readonly milestones?: readonly Text[];
  readonly released_at?: Text;
}

/** One `parallel:matrix` row: the author's key order, and a scalar or a list of scalars per cell. */
export type MatrixRow = Readonly<Record<string, Scalar | readonly Scalar[]>>;

/** The `matrix` form of a job's `parallel`. */
export interface ParallelMatrix {
  readonly matrix: readonly MatrixRow[];
}

/** An instance count, or the matrix that expands the job into one job per row. */
export type Parallel = number | ParallelMatrix;

/** The map form of `allow_failure`: exit codes that do not fail the pipeline. */
export interface AllowFailureOptions {
  readonly exit_codes: number | readonly number[];
}

export type AllowFailure = boolean | AllowFailureOptions;

/** The `paths`/`compare_to` form of `rules:changes`. */
export interface Changes {
  readonly paths: readonly string[];
  readonly compare_to?: Text;
}

/**
 * `rules:changes` as GitLab writes it: the map form, or a plain list of paths. The corpus also
 * carries the list a `!reference` tag leaves behind after parsing, which is the same sequence.
 */
export type RuleChanges = Changes | readonly string[];

/** One entry of a job's `needs`: a job name, or the map form with its DAG options. */
export interface NeedMap {
  readonly job: string;
  readonly optional?: boolean;
  readonly artifacts?: boolean;
  readonly parallel?: NeedParallel;
}

/** The `needs:parallel` selector: flat scalar rows, in the author's order. */
export interface NeedParallel {
  readonly matrix: readonly Readonly<Record<string, Scalar>>[];
}

export type Need = string | NeedMap;

/** One ordered condition, shared by `workflow`, `include` and a job. */
export interface Rule {
  readonly if?: Text;
  readonly changes?: RuleChanges;
  readonly exists?: readonly string[];
  readonly when?: When;
  readonly allow_failure?: boolean;
  readonly variables?: Readonly<Record<string, Scalar>>;
  readonly needs?: readonly string[];
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
  /** One template name or several. Never resolved: the target may live in an include. */
  readonly extends?: string | readonly string[];
  /** DAG edges, in author order. Never checked for dangling names: a target may live in an include. */
  readonly needs?: readonly Need[];
  /** The job's condition list, in author order. */
  readonly rules?: readonly Rule[];
  readonly tags?: readonly string[];
  readonly image?: Image;
  readonly services?: readonly Service[];
  readonly variables?: Readonly<Record<string, Scalar>>;
  /** Which global `default:` keys and `variables:` this job inherits. */
  readonly inherit?: Inherit;
  /** External secrets, keyed by the environment variable they fill. */
  readonly secrets?: Readonly<Record<string, Secret>>;
  readonly cache?: CacheList;
  readonly artifacts?: Artifacts;
  /** The earlier jobs whose artifacts this job downloads; an empty list downloads none. */
  readonly dependencies?: readonly string[];
  /** Runner lifecycle hooks, such as `pre_get_sources_script`. */
  readonly hooks?: Hooks;
  /** The delay before a `when: delayed` job starts, in GitLab's duration spelling. */
  readonly start_in?: Text;
  /** The confirmation text GitLab shows for a manual job. */
  readonly manual_confirmation?: Text;
  /** The DAST site and scanner profiles this job uses. */
  readonly dast_configuration?: DastConfiguration;
  /** The same shape and lowering as `script`; a `ref` leaf keeps its tag. */
  readonly before_script?: Script;
  readonly script?: Script;
  readonly after_script?: Script;
  /** A deployment target, as its name or as the map with `url` and lifecycle hooks. */
  readonly environment?: Environment;
  /** The release this job creates; emitted as data, never submitted anywhere. */
  readonly release?: Release;
  /** A downstream or child pipeline; emitted as data, and the target is never resolved. */
  readonly trigger?: Trigger;
  /** An instance count, or a matrix of scalar rows that expands the job. */
  readonly parallel?: Parallel;
  /** A retry count, or the map with `when` conditions and `exit_codes`. */
  readonly retry?: Retry;
  readonly timeout?: Text;
  readonly interruptible?: boolean;
  readonly allow_failure?: AllowFailure;
  readonly when?: When;
  readonly resource_group?: Text;
  readonly coverage?: Text;
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
