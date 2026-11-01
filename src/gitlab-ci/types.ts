import type { Scalar, Text, Value } from "../core/index.js";
import type { CacheList } from "./cache-types.js";
import type { JobInputs } from "./input-types.js";
import type { RuleExists, Variables } from "./nesting-types.js";
import type { ArtifactAccess, ArtifactReports } from "./artifact-types.js";
import type { DastConfiguration, Hooks, Inherit } from "./deferred-types.js";
import type { JobPages } from "./pages-types.js";
import type { AutoCancel, Default, Include, Workflow } from "./pipeline-types.js";
import type { Step } from "./run-types.js";
import type { Environment, Image, Release, Service } from "./runtime-types.js";
import type { Trigger } from "./trigger-types.js";
import type { Secret } from "./secret-types.js";
import type { Identity, IdTokens } from "./token-types.js";

export type { ArtifactAccess, ArtifactReports } from "./artifact-types.js";

export type { Cache, CacheKeyFiles, CacheList } from "./cache-types.js";

export type { RuleExists, Variable, Variables } from "./nesting-types.js";

export type { DastConfiguration, Hooks, Inherit } from "./deferred-types.js";

export type { JobInput, JobInputs, JobInputType } from "./input-types.js";

export type { Identity, IdTokens } from "./token-types.js";

export type { JobPages, Pages } from "./pages-types.js";

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

/** The runtime and release shapes live in their own module so this one stays within its line budget. */
export type {
  DockerOptions,
  Environment,
  EnvironmentDashboard,
  EnvironmentKubernetes,
  EnvironmentManagedResources,
  Image,
  KubernetesOptions,
  Release,
  ReleaseAssets,
  ReleaseLink,
  Service,
  ServiceOptions,
} from "./runtime-types.js";

/**
 * A job's commands, in GitLab's own spelling: one string, one leaf that decides its own style, or an
 * ordered list of them. No literal block is produced; a block scalar would add a trailing newline and
 * change the parsed value.
 */
export type Script = Text | readonly Text[];

/** The `run` step types live in their own module so this one stays within its line budget. */
export type {
  FunctionReference,
  FunctionStep,
  GitFunction,
  OciFunction,
  ScriptStep,
  Step,
  StepEnv,
  StepInputs,
} from "./run-types.js";

/** The closed set GitLab documents for a job's run condition. */
export type When = "on_success" | "on_failure" | "always" | "never" | "manual" | "delayed";

/** The three statuses `cache:when` and `artifacts:when` accept; narrower than `When`. */
export type OnStatus = "on_success" | "on_failure" | "always";

export interface Artifacts {
  readonly paths?: readonly string[];
  readonly exclude?: readonly string[];
  readonly name?: Text;
  readonly expire_in?: Text;
  readonly expose_as?: Text;
  readonly untracked?: boolean;
  readonly access?: ArtifactAccess;
  readonly public?: boolean;
  readonly when?: OnStatus;
  /**
   * A closed map of GitLab's documented report keys. Lowering keeps the author's key order, so the
   * struct's insertion order is the emitted order; a report value keeps its scalar, list or map
   * shape because flattening one path into a list would change the value the provider reads.
   */
  readonly reports?: ArtifactReports;
}

export interface RetryOptions {
  readonly max: number;
  readonly when?: readonly string[];
  readonly exit_codes?: number | readonly number[];
}

/** A retry count, or the map with `when` conditions and `exit_codes`. */
export type Retry = number | RetryOptions;

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

/** The `paths`/`compare_to`/`regexp` form of `rules:changes`; GitLab requires paths or regexp. */
export interface Changes {
  readonly paths?: readonly string[];
  readonly compare_to?: Text;
  readonly regexp?: Text;
}

/**
 * `rules:changes` as GitLab writes it: the map form, or a plain list of paths. The corpus also
 * carries the list a `!reference` tag leaves behind after parsing, which is the same sequence.
 */
export type RuleChanges = Changes | readonly string[];

/** One entry of a job's `needs`: a job name, or the map form with its DAG and cross-project options. */
export interface NeedMap {
  readonly job: string;
  readonly optional?: boolean;
  readonly artifacts?: boolean;
  readonly parallel?: NeedParallel;
  /** The project a cross-project need reads from; `ref` names the revision within it. */
  readonly project?: Text;
  readonly ref?: Text;
  /** The upstream pipeline ID a same-project need waits on. */
  readonly pipeline?: Text;
}

/** The `needs:parallel` selector: flat scalar rows, in the author's order. */
export interface NeedParallel {
  readonly matrix: readonly Readonly<Record<string, Scalar>>[];
}

export type Need = string | NeedMap;

/** The map form of one rule-level need: a job name, and its artifact and presence options. */
export interface RuleNeedMap {
  readonly job: string;
  readonly artifacts?: boolean;
  readonly optional?: boolean;
}

/** A rule's `needs`: a job name, or the map that selects its artifacts and optionality. */
export type RuleNeed = string | RuleNeedMap;

/** One ordered condition, shared by `workflow`, `include` and a job. */
export interface Rule {
  readonly if?: Text;
  readonly changes?: RuleChanges;
  readonly exists?: RuleExists;
  readonly when?: When;
  readonly allow_failure?: boolean;
  readonly variables?: Variables;
  readonly needs?: readonly RuleNeed[];
  /** The delay before a delayed manual job starts when this rule matches. */
  readonly start_in?: Text;
  /** Whether a matching rule marks the job interruptible. */
  readonly interruptible?: boolean;
  /** Workflow rules only: cancel superseded pipelines when this rule matches. */
  readonly auto_cancel?: AutoCancel;
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
  readonly variables?: Variables;
  /** Which global `default:` keys and `variables:` this job inherits. */
  readonly inherit?: Inherit;
  /** External secrets, keyed by the environment variable they fill. */
  readonly secrets?: Readonly<Record<string, Secret>>;
  /** ID tokens, keyed by the environment variable GitLab injects the JWT as. */
  readonly id_tokens?: IdTokens;
  /** Workload identity federation; the provider is a closed set GitLab documents. */
  readonly identity?: Identity;
  readonly cache?: CacheList;
  readonly artifacts?: Artifacts;
  /**
   * The Pages deployment this job triggers: `true` publishes the job's artifacts, the map names the
   * directory and its lifetime. Emitted after `artifacts`, whose `paths` it usually publishes.
   */
  readonly pages?: JobPages;
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
  /** Typed inputs a manual run or retry may override, keyed by the name the job reads. */
  readonly inputs?: JobInputs;
  /** The same shape and lowering as `script`; a `ref` leaf keeps its tag. */
  readonly before_script?: Script;
  readonly script?: Script;
  /**
   * The GitLab Functions step list. `run` and `script` are alternatives: GitLab refuses a job that
   * declares both, and so does `validate`. Emitted immediately after `script`, where both would sit
   * if a job could carry them together.
   */
  readonly run?: readonly Step[];
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
 * The pipeline-level vocabulary. Emission order is fixed by the spec: `default`, `include`, `stages`,
 * `variables`, `workflow`, the templates, the jobs, then `raw`.
 */
export interface Pipeline {
  readonly default?: Default;
  readonly include?: Include;
  readonly stages?: readonly string[];
  readonly variables?: Variables;
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

/** Near-identity inference anchors: pin the type and return the input itself, never throwing. */
export const pipeline = (value: Pipeline): Pipeline => value;

export const job = (value: Job): Job => value;
