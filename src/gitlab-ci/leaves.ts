import { DOC, fromValue, seq, tagged, type Doc, type LeafNode } from "../core/index.js";

/**
 * A GitLab `!reference`: a YAML-tagged sequence naming another `include`d file's key path. The
 * segments are the author's text; nothing here resolves them, so a path that names nothing still
 * renders exactly as written.
 */
export const ref = (segments: readonly string[]): LeafNode => ({
  [DOC]: (): Doc => tagged("!reference", seq(segments.map((segment) => fromValue(segment)))),
  toString: (): string => `!reference ${JSON.stringify(segments)}`,
});
