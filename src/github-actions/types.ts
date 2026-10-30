import type { Text } from "../core/index.js";
import type { On } from "./trigger.js";

/** A shell or action step, in GitHub's documented key order. */
export interface Step {
  readonly id?: string;
  readonly if?: Text;
  readonly name?: Text;
  readonly uses?: string;
  readonly run?: Text;
  readonly "working-directory"?: Text;
  readonly shell?: string;
  readonly with?: Readonly<Record<string, Text>>;
  readonly env?: Readonly<Record<string, Text>>;
  readonly "continue-on-error"?: boolean | Text;
  readonly "timeout-minutes"?: number;
}

/**
 * A matrix element. A string that spells a canonical number still emits as a number; that is core's
 * documented lowering rule, not a matrix special case.
 */
export type MatrixValue = string | number | boolean;

export interface Strategy {
  readonly matrix?: Readonly<Record<string, readonly MatrixValue[]>>;
  readonly "fail-fast"?: boolean;
  readonly "max-parallel"?: number;
}

export type PermissionLevel = "read" | "write" | "none";

export type PermissionScope =
  | "actions"
  | "artifact-metadata"
  | "attestations"
  | "checks"
  | "code-quality"
  | "contents"
  | "copilot-requests"
  | "deployments"
  | "discussions"
  | "id-token"
  | "issues"
  | "packages"
  | "pages"
  | "pull-requests"
  | "security-events"
  | "statuses"
  | "vulnerability-alerts";

/** `read-all`, `write-all`, or a scope map in the author's order. */
export type Permissions =
  | "read-all"
  | "write-all"
  | Readonly<Partial<Record<PermissionScope, PermissionLevel>>>;

export interface RunDefaults {
  readonly shell?: Text;
  readonly "working-directory"?: Text;
}

export interface Defaults {
  readonly run?: RunDefaults;
}

export interface ConcurrencyGroup {
  readonly group: Text;
  readonly "cancel-in-progress"?: boolean | Text;
}

export type Concurrency = string | ConcurrencyGroup;

/** Credentials lower in author order, so a password can be written before a username. */
export interface Credentials {
  readonly username?: Text;
  readonly password?: Text;
}

export interface Container {
  readonly image: Text;
  readonly credentials?: Credentials;
  readonly env?: Readonly<Record<string, Text>>;
  readonly ports?: readonly (string | number)[];
  readonly volumes?: readonly string[];
  readonly options?: string;
}

export interface EnvironmentTarget {
  readonly name: Text;
  readonly url?: Text;
}

export type Environment = string | EnvironmentTarget;

export type Secrets = "inherit" | Readonly<Record<string, Text>>;

/** A job, in GitHub's documented key order. `id` is the map key, never a field in the output. */
export interface Job {
  readonly id: string;
  readonly name?: Text;
  readonly permissions?: Permissions;
  readonly needs?: string | readonly string[];
  readonly if?: Text;
  readonly "runs-on"?: string;
  readonly environment?: Environment;
  readonly concurrency?: Concurrency;
  readonly outputs?: Readonly<Record<string, Text>>;
  readonly env?: Readonly<Record<string, Text>>;
  readonly defaults?: Defaults;
  readonly steps?: readonly Step[];
  readonly "timeout-minutes"?: number;
  readonly strategy?: Strategy;
  readonly "continue-on-error"?: boolean | Text;
  readonly container?: Container;
  readonly services?: Readonly<Record<string, Container>>;
  readonly uses?: string;
  readonly with?: Readonly<Record<string, Text>>;
  readonly secrets?: Secrets;
}

export interface Workflow {
  readonly name: string;
  readonly on: On;
  readonly permissions?: Permissions;
  readonly env?: Readonly<Record<string, Text>>;
  readonly defaults?: Defaults;
  readonly concurrency?: Concurrency;
  readonly jobs: readonly Job[];
}

/**
 * Builders are near-identity inference anchors: they pin the type and return the input itself, so a
 * call can never throw, default, merge or clone.
 */
export const step = (input: Step): Step => input;

export const job = (input: Job): Job => input;

export const workflow = (input: Workflow): Workflow => input;
