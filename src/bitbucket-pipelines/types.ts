import type { Text, Value } from "../core/index.js";

/** A pipe call inside a script sequence: an id plus optional variables, never a leaf. */
export interface Pipe {
  readonly pipe: Text;
  readonly variables?: Readonly<Record<string, Text | readonly Text[]>>;
}

/** One element of a script: a command string, a leaf, or a pipe. */
export type ScriptItem = Text | Pipe;

/** A step image: a name string, a name map, or a private registry with credentials. */
export type Image =
  | Text
  | { readonly name: Text }
  | { readonly name: Text; readonly username: Text; readonly password: Text };

/** Path filters on a changeset condition; exactly one list, never both. */
export type Changesets =
  | { readonly includePaths: readonly string[]; readonly excludePaths?: never }
  | { readonly excludePaths: readonly string[]; readonly includePaths?: never };

/** A step condition: a state expression or a changeset filter. */
export interface Condition {
  readonly state?: Text;
  readonly changesets?: Changesets;
}

/** How a step or stage starts. */
export type Trigger = "automatic" | "manual";

/** A step body. Keys keep Bitbucket's own spelling; emission order is the schema's. */
export interface Step {
  readonly "after-script"?: readonly ScriptItem[];
  readonly artifacts?: readonly string[];
  readonly caches?: readonly Text[];
  readonly clone?: Clone;
  readonly condition?: Condition;
  readonly "concurrency-group"?: Text;
  readonly deployment?: Text;
  readonly environment?: Text;
  readonly "fail-fast"?: boolean;
  readonly image?: Image;
  readonly "max-time"?: number;
  readonly name?: Text;
  readonly oidc?: boolean;
  readonly "runs-on"?: readonly Text[];
  readonly script: readonly ScriptItem[];
  readonly services?: readonly Text[];
  readonly size?: Size;
  readonly trigger?: Trigger;
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
  readonly size?: Size;
  readonly "runs-on"?: readonly Text[];
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
  readonly image?: Text;
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

/** One manually triggered pipeline: a name and the items it runs. */
export interface NamedPipeline {
  readonly name: string;
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

/**
 * The document. It is not called `Pipeline` because Bitbucket uses that word for each triggered
 * entry as well as for the file.
 */
export interface PipelineConfig {
  readonly image?: Image;
  readonly options?: Options;
  readonly clone?: Clone;
  readonly definitions?: Definitions;
  readonly pipelines: Pipelines;
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
