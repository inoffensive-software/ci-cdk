import type { LeafNode, Text, Value } from "../core/index.js";
import type { On } from "./trigger.js";

/**
 * An arbitrary YAML scalar, for maps whose keys the author chooses. Wider than `Text` because GitHub
 * keeps `fetch-depth: 0` and `persist-credentials: false` typed: a quoted `"0"` is a different value
 * to the action that reads it.
 */
export type Scalar = string | number | boolean | LeafNode;

/** A shell or action step, in GitHub's documented key order. */
export interface Step {
  readonly id?: string;
  readonly if?: Text;
  readonly name?: Text;
  readonly uses?: string;
  readonly run?: Text;
  readonly "working-directory"?: Text;
  readonly shell?: string;
  readonly with?: Readonly<Record<string, Scalar>>;
  readonly env?: Readonly<Record<string, Scalar>>;
  readonly "continue-on-error"?: boolean | Text;
  readonly "timeout-minutes"?: number;
  /** Starts the step asynchronously; `wait` and `cancel` reach it by `id`. */
  readonly background?: boolean;
  /** One background step id, or several. */
  readonly wait?: string | readonly string[];
  /** A bare `wait-all` is `null`, which is what the upstream file parses to. */
  readonly "wait-all"?: boolean | null;
  /** The id of the one background step this step terminates. */
  readonly cancel?: string;
  /** Steps that run together, each as a background step, with an implicit wait at the end. */
  readonly parallel?: readonly Step[];
  /** Keys the vocabulary does not model, emitted in this step's body after the modelled keys. */
  readonly raw?: Readonly<Record<string, Value>>;
}

/**
 * A matrix element: a scalar, or a flat record whose keys the author chooses. A record lowers through
 * the boundary parser, so its key order survives and a row that omits a key omits it.
 */
export type MatrixValue = Scalar | Readonly<Record<string, Scalar>>;

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
  readonly queue?: "single" | "max";
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
  readonly env?: Readonly<Record<string, Scalar>>;
  readonly ports?: readonly (string | number)[];
  readonly volumes?: readonly string[];
  readonly options?: string;
}

export interface EnvironmentTarget {
  readonly name: Text;
  readonly url?: Text;
  readonly deployment?: boolean;
}

/** The closed set of cache access policies GitHub documents for a workflow or a job. */
export type CacheMode = "read" | "write" | "write-only" | "none";

export type Environment = string | EnvironmentTarget;

export type Secrets = "inherit" | Readonly<Record<string, Text>>;

/**
 * A job, in the corpus's key order: GitHub's documented order, with `strategy` moved ahead of the
 * body it shapes because the pinned configs write it that way (ADR 0004). `id` is the map key,
 * never a field in the output.
 */
export interface Job {
  readonly id: string;
  readonly name?: Text;
  readonly permissions?: Permissions;
  readonly "cache-mode"?: CacheMode;
  readonly needs?: string | readonly string[];
  readonly if?: Text;
  /** A label, a label set, or an expression leaf: a string lowers to a scalar, an array to a sequence. */
  readonly "runs-on"?: readonly string[] | Text;
  readonly strategy?: Strategy;
  readonly environment?: Environment;
  readonly concurrency?: Concurrency;
  readonly outputs?: Readonly<Record<string, Text>>;
  readonly env?: Readonly<Record<string, Scalar>>;
  readonly defaults?: Defaults;
  readonly steps?: readonly Step[];
  readonly "timeout-minutes"?: number;
  readonly "continue-on-error"?: boolean | Text;
  readonly container?: Container;
  readonly services?: Readonly<Record<string, Container>>;
  readonly uses?: string;
  readonly with?: Readonly<Record<string, Scalar>>;
  readonly secrets?: Secrets;
  /** Keys the vocabulary does not model, emitted in this job's body after the modelled keys. */
  readonly raw?: Readonly<Record<string, Value>>;
}

export interface Workflow {
  readonly name: string;
  readonly "run-name"?: Text;
  readonly on: On;
  readonly permissions?: Permissions;
  readonly "cache-mode"?: CacheMode;
  readonly env?: Readonly<Record<string, Scalar>>;
  readonly defaults?: Defaults;
  readonly concurrency?: Concurrency;
  readonly jobs: readonly Job[];
  /**
   * Keys the vocabulary does not model. Lowered after the modelled keys, in author order, and
   * checked by the core boundary parser like any other plain data.
   */
  readonly raw?: Readonly<Record<string, Value>>;
}

/**
 * Builders are near-identity inference anchors: they pin the type and return the input itself, so a
 * call can never throw, default, merge or clone.
 */
export const step = (input: Step): Step => input;

export const job = (input: Job): Job => input;

export const workflow = (input: Workflow): Workflow => input;
