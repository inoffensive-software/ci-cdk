import type { Scalar, Text } from "../core/index.js";
import type { IncludeEntry } from "./types.js";

/** The closed set a trigger's `strategy` accepts: whether the bridge job waits on the downstream. */
export type TriggerStrategy = "depend" | "mirror";

/**
 * A multi-project trigger: the project to run, the branch, and what to pass. Every value is
 * data; the target is never looked up.
 */
export interface ProjectTrigger {
  readonly project: Text;
  readonly branch?: Text;
  readonly strategy?: TriggerStrategy;
  readonly inputs?: Readonly<Record<string, Scalar>>;
}

/** A child-pipeline trigger: the include that defines the pipeline, and the strategy. */
export interface ChildTrigger {
  readonly include: IncludeEntry | readonly IncludeEntry[];
  readonly strategy?: TriggerStrategy;
}

/**
 * The `trigger` job keyword: a child pipeline path as a bare string, a multi-project trigger, or a
 * child-pipeline trigger. The target, the branch and the include are never resolved.
 */
export type Trigger = Text | ProjectTrigger | ChildTrigger;
