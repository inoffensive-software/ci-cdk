import type { Text } from "../core/index.js";

/**
 * One `id_tokens` entry: the names GitLab injects are the map keys, and `aud` is the mandatory
 * audience the JWT is minted for. GitLab documents one audience or a list of them.
 */
export interface IdToken {
  readonly aud: Text | readonly Text[];
}

/** The author-named token map `id_tokens` takes: variable names in insertion order. */
export type IdTokens = Readonly<Record<string, IdToken>>;

/** The identity federation providers GitLab documents for `identity`. */
export type Identity = "google_cloud";
