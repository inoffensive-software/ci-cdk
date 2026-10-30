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

/** One pipeline item. The alias widens when the other item forms land. */
export interface StepItem {
  readonly step: Step;
}

export type PipelineItem = StepItem;

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

/** The trigger sections the provider models. Every other section is out of scope. */
export interface Pipelines {
  readonly default?: readonly PipelineItem[];
  readonly branches?: readonly SelectorPipeline[];
  readonly tags?: readonly SelectorPipeline[];
  readonly "pull-requests"?: readonly SelectorPipeline[];
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

export const pipe = (value: Pipe): Pipe => value;
