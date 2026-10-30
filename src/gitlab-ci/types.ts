import type { Text } from "../core/index.js";

/**
 * A job's commands, in GitLab's own spelling: one string, one leaf that decides its own style, or an
 * ordered list of them. No literal block is produced; a block scalar would add a trailing newline and
 * change the parsed value.
 */
export type Script = Text | readonly Text[];

/** A named job. `name` is the map key in the output and never appears in the job body. */
export interface Job {
  readonly name: string;
  readonly stage?: string;
  readonly script: Script;
}

/** `stages` is emitted exactly as written; `jobs` becomes a map keyed by name in array order. */
export interface Pipeline {
  readonly stages?: readonly string[];
  readonly jobs: readonly Job[];
}

/**
 * Builders are near-identity inference anchors: they pin the type and return the input itself, so a
 * call can never throw, default, merge or clone.
 */
export const pipeline = (value: Pipeline): Pipeline => value;

export const job = (value: Job): Job => value;
