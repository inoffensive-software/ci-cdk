import type { Text } from "../core/index.js";

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

export interface Job {
  readonly id: string;
  readonly "runs-on": string;
  readonly steps: readonly Step[];
}

export interface Workflow {
  readonly name: string;
  readonly on: string;
  readonly jobs: readonly Job[];
}

/**
 * Builders are near-identity inference anchors: they pin the type and return the input itself, so a
 * call can never throw, default, merge or clone.
 */
export const step = (input: Step): Step => input;

export const job = (input: Job): Job => input;

export const workflow = (input: Workflow): Workflow => input;
