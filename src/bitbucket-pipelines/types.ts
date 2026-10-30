import type { Text, Value } from "../core/index.js";

/** A pipe call inside a script sequence: an id plus optional variables, never a leaf. */
export interface Pipe {
  readonly pipe: Text;
  readonly variables?: Readonly<Record<string, Text | readonly Text[]>>;
}

/** One element of a script: a command string, a leaf, or a pipe. */
export type ScriptItem = Text | Pipe;

/** A step body. Keys keep Bitbucket's own spelling; the tracer models only these four. */
export interface Step {
  readonly name?: Text;
  readonly oidc?: boolean;
  readonly script: readonly ScriptItem[];
  readonly raw?: Readonly<Record<string, Value>>;
}

/** One pipeline item. The alias widens when the other item forms land. */
export interface StepItem {
  readonly step: Step;
}

export type PipelineItem = StepItem;

/** One `branches` entry: a selector pattern and the pipeline it runs. */
export interface SelectorPipeline {
  readonly pattern: string;
  readonly pipeline: readonly PipelineItem[];
}

/** The trigger sections the tracer models. Every other section is out of scope. */
export interface Pipelines {
  readonly default?: readonly PipelineItem[];
  readonly branches?: readonly SelectorPipeline[];
}

/**
 * The document. It is not called `Pipeline` because Bitbucket uses that word for each triggered
 * entry as well as for the file.
 */
export interface PipelineConfig {
  readonly image?: Text;
  readonly pipelines: Pipelines;
  readonly raw?: Readonly<Record<string, Value>>;
}

/** Builders are near-identity inference anchors; they never validate, default, merge or clone. */
export const pipelineConfig = (value: PipelineConfig): PipelineConfig => value;

/** Wraps a step body in the singular `step:` key, so the item form is a type. */
export const step = (value: Step): StepItem => ({ step: value });

export const pipe = (value: Pipe): Pipe => value;
