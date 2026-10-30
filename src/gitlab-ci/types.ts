import type { Text, Value } from "../core/index.js";

/**
 * A job's commands, in GitLab's own spelling: one string, one leaf that decides its own style, or an
 * ordered list of them. No literal block is produced; a block scalar would add a trailing newline and
 * change the parsed value.
 */
export type Script = Text | readonly Text[];

/**
 * A named job. `name` is the map key in the output and never appears in the job body.
 *
 * `script` is optional because a file may be a fragment: GitLab merges included jobs by name, so a
 * job here can override `rules`, `needs` or a matrix and leave `script` to the job it merges with. An
 * absent `script` emits no key at all; an empty string or array is still refused.
 */
export interface Job {
  readonly name: string;
  readonly stage?: string;
  readonly script?: Script;
  /** Job keywords the vocabulary does not model, appended after `stage` and `script`. */
  readonly raw?: Readonly<Record<string, Value>>;
}

/**
 * `stages` is emitted exactly as written; hidden templates are emitted after it in record order;
 * `jobs` becomes a map keyed by name in array order.
 */
export interface Pipeline {
  readonly stages?: readonly string[];
  /**
   * Hidden jobs and anchor-only entries: author data, not vocabulary. Every key must start with `.`
   * and is emitted at the document root, before the job entries, in record order. Values are plain
   * data of any shape and are never validated or resolved.
   */
  readonly templates?: Readonly<Record<string, Value>>;
  readonly jobs: readonly Job[];
  /**
   * Global keywords the vocabulary does not model, appended after `stages`, the templates and the job
   * entries: `image`, `workflow`, `variables`, and their like.
   */
  readonly raw?: Readonly<Record<string, Value>>;
}

/**
 * Builders are near-identity inference anchors: they pin the type and return the input itself, so a
 * call can never throw, default, merge or clone.
 */
export const pipeline = (value: Pipeline): Pipeline => value;

export const job = (value: Job): Job => value;
