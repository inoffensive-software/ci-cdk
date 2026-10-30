/** Every event GitHub documents as a workflow trigger. */
export type EventName =
  | "branch_protection_rule"
  | "check_run"
  | "check_suite"
  | "create"
  | "delete"
  | "deployment"
  | "deployment_status"
  | "discussion"
  | "discussion_comment"
  | "fork"
  | "gollum"
  | "image_version"
  | "issue_comment"
  | "issues"
  | "label"
  | "merge_group"
  | "milestone"
  | "page_build"
  | "public"
  | "pull_request"
  | "pull_request_review"
  | "pull_request_review_comment"
  | "pull_request_target"
  | "push"
  | "registry_package"
  | "release"
  | "repository_dispatch"
  | "schedule"
  | "status"
  | "watch"
  | "workflow_call"
  | "workflow_dispatch"
  | "workflow_run";

/** The filters `push` and `pull_request` accept, spelled as GitHub spells them. */
export interface EventFilter {
  readonly branches?: readonly string[];
  readonly "branches-ignore"?: readonly string[];
  readonly paths?: readonly string[];
  readonly "paths-ignore"?: readonly string[];
  readonly tags?: readonly string[];
  readonly "tags-ignore"?: readonly string[];
  readonly types?: readonly string[];
}

/** The filters `image_version` accepts; both support glob patterns. */
export interface ImageVersionFilter {
  readonly names?: readonly string[];
  readonly versions?: readonly string[];
}

export interface CronEntry {
  readonly cron: string;
}

export type InputType = "string" | "boolean" | "choice" | "environment";

interface CommonInput {
  readonly description?: string;
  readonly required?: boolean;
}

export interface StringInput extends CommonInput {
  readonly type: "string";
  readonly default?: string;
}

export interface BooleanInput extends CommonInput {
  readonly type: "boolean";
  readonly default?: boolean;
}

export interface ChoiceInput extends CommonInput {
  readonly type: "choice";
  readonly default?: string;
  readonly options: readonly string[];
}

export interface EnvironmentInput extends CommonInput {
  readonly type: "environment";
  readonly default?: string;
}

/** Discriminated by `type`, so `options` is only legal on a choice input. */
export type Input = StringInput | BooleanInput | ChoiceInput | EnvironmentInput;

/** `workflow_call` accepts the string and boolean arms; choice and environment are dispatch-only. */
export type WorkflowCallInput = StringInput | BooleanInput;

export interface WorkflowDispatch {
  readonly inputs?: Readonly<Record<string, Input>>;
}

export interface WorkflowCall {
  readonly inputs?: Readonly<Record<string, WorkflowCallInput>>;
}

/** A documented event that takes no options; it emits as `null`, the way a bare event is written. */
type EmptyTrigger = Readonly<Record<string, never>>;

type ConfiguredEvent =
  | "push"
  | "pull_request"
  | "image_version"
  | "schedule"
  | "workflow_call"
  | "workflow_dispatch";

/**
 * The event map, closed over the documented event names. Every option key is the author's order,
 * because that is the order the emitted file preserves.
 */
export type Triggers = {
  readonly push?: EventFilter;
  readonly pull_request?: EventFilter;
  readonly image_version?: ImageVersionFilter;
  readonly schedule?: readonly CronEntry[];
  readonly workflow_call?: WorkflowCall;
  readonly workflow_dispatch?: WorkflowDispatch;
} & {
  readonly [Event in Exclude<EventName, ConfiguredEvent>]?: EmptyTrigger;
};

export type On = EventName | readonly EventName[] | Triggers;
