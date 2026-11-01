import type { Text } from "../core/index.js";

/** The `files`/`files_commits`/`prefix` form of `cache:key`; a plain `Text` key is the other form. */
export interface CacheKeyFiles {
  readonly files?: readonly string[];
  readonly files_commits?: readonly string[];
  readonly prefix?: Text;
}

export interface Cache {
  readonly key?: Text | CacheKeyFiles;
  readonly paths: readonly string[];
  readonly policy?: "pull" | "push" | "pull-push";
  /** Share the cache between protected and unprotected branches. */
  readonly unprotect?: boolean;
  readonly when?: "on_success" | "on_failure" | "always";
  readonly fallback_keys?: readonly string[];
  readonly untracked?: boolean;
}

/** One cache, or several; GitLab accepts either shape wherever `cache` is written. */
export type CacheList = Cache | readonly Cache[];
