import type { Text, Value } from "../core/index.js";
import type { ImageAws, Runtime } from "./runtime-types.js";

export type {
  AwsStorage,
  AwsStorageKeys,
  AwsStorageRole,
  CloudRuntime,
  GcpStorage,
  ImageAws,
  ImageAwsKeys,
  ImageAwsRole,
  Runtime,
  RuntimeStorage,
  SelfHostedRuntime,
} from "./runtime-types.js";

/** A pipe call inside a script sequence: an id plus optional variables, never a leaf. */
export interface Pipe {
  readonly pipe: Text;
  readonly variables?: Readonly<Record<string, Text | readonly Text[]>>;
}

/** One element of a script: a command string, a leaf, or a pipe. */
export type ScriptItem = Text | Pipe;

/**
 * A step image: a name string, a name map, an ECR map, or a private registry with credentials.
 * Credentials always come as a pair; `run-as-user` is available on every map form.
 */
export type Image =
  | Text
  | { readonly name: Text; readonly aws: ImageAws; readonly "run-as-user"?: number }
  | {
      readonly name: Text;
      readonly username: Text;
      readonly password: Text;
      readonly "run-as-user"?: number;
    }
  | { readonly name: Text; readonly "run-as-user"?: number };

/** Path filters on a changeset condition; exactly one list, never both. */
export type Changesets =
  | { readonly includePaths: readonly string[]; readonly excludePaths?: never }
  | { readonly excludePaths: readonly string[]; readonly includePaths?: never };

/** A step condition: a state expression or a changeset filter. */
export interface Condition {
  readonly state?: Text;
  readonly changesets?: Changesets;
}

/** The kind of artifact an upload publishes. */
export type ArtifactUploadType = "shared" | "scoped" | "test-reports";

/** When an upload captures its files. */
export type ArtifactCaptureOn = "success" | "failed" | "always";

/**
 * One named artifact upload: a name, the paths it captures, and the schema's optional filters.
 * `depth` bounds the search below each path; zero is refused because the schema's minimum is one.
 */
export interface ArtifactUpload {
  readonly "capture-on"?: ArtifactCaptureOn;
  readonly depth?: number;
  readonly "ignore-paths"?: readonly string[];
  readonly name: Text;
  readonly paths: readonly string[];
  readonly type?: ArtifactUploadType;
}

/**
 * A step's artifacts: a path list, or the expanded map that filters downloads and publishes named
 * uploads. Exactly one shape per step, because Bitbucket parses the key as either.
 */
export type Artifacts =
  | readonly string[]
  | {
      readonly paths?: readonly string[];
      readonly download?: boolean | readonly string[];
      readonly upload?: readonly ArtifactUpload[];
    };

/** How a step or stage starts. */
export type Trigger = "automatic" | "manual";

/** A step's auth configuration: the schema's system layer and its scopes. */
export interface StepAuth {
  readonly system?: { readonly scopes?: readonly Text[] };
}

/**
 * A step body. Keys keep Bitbucket's own spelling; emission order is the schema's. `script` is
 * absent only on a child pipeline step, which validation enforces: an inline step needs a command
 * sequence and a `type: pipeline` step needs a `custom` target instead.
 */
export interface Step {
  readonly "after-script"?: readonly ScriptItem[];
  readonly artifacts?: Artifacts;
  readonly auth?: StepAuth;
  readonly caches?: readonly Text[];
  readonly clone?: Clone;
  readonly condition?: Condition;
  readonly "concurrency-group"?: Text;
  readonly custom?: Text;
  readonly deployment?: Text;
  readonly environment?: Text;
  readonly "fail-fast"?: boolean;
  readonly image?: Image;
  readonly "input-variables"?: Readonly<Record<string, Text>>;
  readonly "max-time"?: number;
  readonly name?: Text;
  readonly oidc?: boolean;
  readonly "output-variables"?: readonly Text[];
  readonly "runs-on"?: readonly Text[];
  readonly runtime?: Runtime;
  readonly script?: readonly ScriptItem[];
  readonly services?: readonly Text[];
  readonly size?: Size;
  readonly trigger?: Trigger;
  readonly type?: "pipeline";
  readonly raw?: Readonly<Record<string, Value>>;
}

/** One pipeline item. */
export interface StepItem {
  readonly step: Step;
}

/**
 * A step inside a stage. Bitbucket carries the condition on the stage, so a stage step has no
 * `condition` of its own; every other position keeps the full `Step`.
 */
export interface StageStepItem {
  readonly step: Omit<Step, "condition">;
}

/** A parallel group: a bare sequence, or a map that also sets `fail-fast`. */
export interface ParallelItem {
  readonly parallel:
    | readonly StepItem[]
    | { readonly steps: readonly StepItem[]; readonly "fail-fast"?: boolean };
}

/** A stage, whose nested sequence is always `steps` rather than `step`. */
export interface Stage {
  readonly condition?: Condition;
  readonly deployment?: Text;
  readonly environment?: Text;
  readonly name?: Text;
  readonly steps: readonly StageStepItem[];
  readonly trigger?: Trigger;
  readonly raw?: Readonly<Record<string, Value>>;
}

export interface StageItem {
  readonly stage: Stage;
}

/**
 * A final step. `deployment`, `fail-fast` and a manual trigger are not expressible, because
 * Bitbucket forbids them on the cleanup step.
 */
export type FinalStep = Omit<Step, "deployment" | "fail-fast" | "trigger"> & {
  readonly trigger?: "automatic";
};

export interface FinalItem {
  readonly final: FinalStep;
}

export type PipelineItem = StepItem | ParallelItem | StageItem | FinalItem;

/** The memory sizes Bitbucket accepts for a step or pipeline. */
export type Size = "1x" | "2x" | "4x" | "8x" | "16x" | "24x" | "32x";

/** Global pipeline settings, emitted in the schema's alphabetical order. */
export interface Options {
  readonly docker?: boolean;
  readonly "max-time"?: number;
  readonly "runs-on"?: readonly Text[];
  readonly runtime?: Runtime;
  readonly size?: Size;
}

/** Global clone behaviour; `depth` stays a number or the string `full`. */
export interface Clone {
  readonly depth?: number | "full";
  readonly enabled?: boolean;
  readonly lfs?: boolean;
  readonly "skip-ssl-verify"?: boolean;
}

/** A named cache: a path string, or a path plus a key built from files. */
export type Cache =
  | Text
  | { readonly path: Text; readonly key?: { readonly files: readonly string[] } };

/** A named service container. */
export interface Service {
  readonly image?: Image;
  readonly memory?: number;
  readonly type?: "docker";
  readonly variables?: Readonly<Record<string, Text>>;
}

/** Reusable caches, services and step groups, declared once and referenced by name. */
export interface Definitions {
  readonly caches?: Readonly<Record<string, Cache>>;
  readonly services?: Readonly<Record<string, Service>>;
  readonly steps?: readonly StepItem[];
}

/** One `branches`, `tags` or `pull-requests` entry: a selector pattern and the pipeline it runs. */
export interface SelectorPipeline {
  readonly pattern: string;
  readonly pipeline: readonly PipelineItem[];
}

/** One manual-run input: a name, an optional default, description and closed value list. */
export interface CustomVariable {
  readonly name: string;
  readonly default?: Text;
  readonly description?: Text;
  readonly "allowed-values"?: readonly Text[];
}

/** One manually triggered pipeline: a name, its input variables and the items it runs. */
export interface NamedPipeline {
  readonly name: string;
  readonly variables?: readonly CustomVariable[];
  readonly pipeline: readonly PipelineItem[];
}

/** The trigger sections the provider models. Every other section is out of scope. */
export interface Pipelines {
  readonly default?: readonly PipelineItem[];
  readonly branches?: readonly SelectorPipeline[];
  readonly tags?: readonly SelectorPipeline[];
  readonly "pull-requests"?: readonly SelectorPipeline[];
  readonly custom?: readonly NamedPipeline[];
}

/** One event trigger: the condition that selects the event and the pipelines it starts. */
export interface TriggerConfig {
  readonly condition: Text;
  readonly pipelines: readonly string[];
}

/**
 * Event triggers keyed by trigger type. The type names are the author's, because Bitbucket's list is
 * wider than any one config and grows.
 */
export type Triggers = Readonly<Record<string, readonly TriggerConfig[]>>;

/**
 * The document. It is not called `Pipeline` because Bitbucket uses that word for each triggered
 * entry as well as for the file.
 */
export interface PipelineConfig {
  readonly image?: Image;
  readonly labels?: Readonly<Record<string, Text>>;
  readonly options?: Options;
  readonly clone?: Clone;
  readonly definitions?: Definitions;
  readonly pipelines: Pipelines;
  readonly triggers?: Triggers;
  readonly raw?: Readonly<Record<string, Value>>;
}

/** Builders are near-identity inference anchors; they never validate, default, merge or clone. */
export const pipelineConfig = (value: PipelineConfig): PipelineConfig => value;

/** Wraps a step body in the singular `step:` key, so the item form is a type. */
export const step = (value: Step): StepItem => ({ step: value });

/** Wraps a parallel group, sequence or map, in the `parallel:` item key. */
export const parallel = (value: ParallelItem["parallel"]): ParallelItem => ({ parallel: value });

/** Wraps a stage body in the `stage:` item key. */
export const stage = (value: Stage): StageItem => ({ stage: value });

/** Wraps a cleanup step body in the `final:` item key. */
export const finalStep = (value: FinalStep): FinalItem => ({ final: value });

export const pipe = (value: Pipe): Pipe => value;
