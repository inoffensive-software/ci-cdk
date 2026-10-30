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

/** A job, in GitHub's documented key order. `id` is the map key, never a field in the output. */
export interface Job {
  readonly id: string;
  readonly name?: Text;
  readonly needs?: string | readonly string[];
  readonly if?: Text;
  readonly "runs-on": string;
  readonly outputs?: Readonly<Record<string, Text>>;
  readonly steps: readonly Step[];
  readonly strategy?: Strategy;
}

export interface Workflow {
  readonly name: string;
  readonly on: On;
  readonly jobs: readonly Job[];
}

/**
 * Builders are near-identity inference anchors: they pin the type and return the input itself, so a
 * call can never throw, default, merge or clone.
 */
export const step = (input: Step): Step => input;

export const job = (input: Job): Job => input;

export const workflow = (input: Workflow): Workflow => input;
