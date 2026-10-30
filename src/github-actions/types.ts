/** A shell step. The only body an action step can have in this first thread is `run`. */
export interface Step {
  readonly run: string;
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
