import type { Text } from "../core/index.js";
import type { Inputs } from "./pipeline-types.js";

/** The closed set a trigger's `strategy` accepts: whether the bridge job waits on the downstream. */
export type TriggerStrategy = "depend" | "mirror";

/**
 * `trigger:forward`: which variables the bridge job hands to the downstream pipeline. Both keys are
 * optional; GitLab's defaults apply when a key is absent, and the DSL writes only what was asked for.
 */
export interface Forward {
  readonly yaml_variables?: boolean;
  readonly pipeline_variables?: boolean;
}

/** The fields every child-pipeline include entry may carry. */
export interface TriggerIncludeOptions {
  readonly inputs?: Inputs;
}

/**
 * One child-pipeline include entry. The schema distinguishes six sources, including the artifact one
 * a dynamic child pipeline reads; none of them carries `rules` or `integrity`, which only a
 * pipeline-level include accepts.
 */
export type TriggerIncludeEntry =
  | (TriggerIncludeOptions & { readonly local: Text })
  | (TriggerIncludeOptions & { readonly template: Text })
  | (TriggerIncludeOptions & {
      readonly artifact: Text;
      readonly job: Text;
    })
  | (TriggerIncludeOptions & {
      readonly project: Text;
      readonly ref?: Text;
      readonly file: Text;
    })
  | (TriggerIncludeOptions & { readonly component: Text })
  | (TriggerIncludeOptions & { readonly remote: Text });

/**
 * A multi-project trigger: the project to run, the branch, what to pass and what to forward. Every
 * value is data; the target is never looked up.
 */
export interface ProjectTrigger {
  readonly project: Text;
  readonly branch?: Text;
  readonly strategy?: TriggerStrategy;
  readonly inputs?: Inputs;
  readonly forward?: Forward;
}

/**
 * A child-pipeline trigger: the include that defines the pipeline, the strategy, and what to
 * forward. A single path stays a scalar; several entries stay a sequence.
 */
export interface ChildTrigger {
  readonly include: Text | TriggerIncludeEntry | readonly TriggerIncludeEntry[];
  readonly strategy?: TriggerStrategy;
  readonly forward?: Forward;
}

/**
 * The `trigger` job keyword: a child pipeline path as a bare string, a multi-project trigger, or a
 * child-pipeline trigger. The target, the branch and the include are never resolved.
 */
export type Trigger = Text | ProjectTrigger | ChildTrigger;
