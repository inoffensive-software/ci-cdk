/** How a scalar's text is presented; decided by whoever built the node, never inferred. */
export type ScalarStyle = "plain" | "single" | "double" | "literal" | "folded";

export interface DocEntry {
  readonly key: string;
  readonly value: Doc;
}

export interface DocMap {
  readonly kind: "map";
  readonly entries: readonly DocEntry[];
  readonly tag?: string;
}

export interface DocSeq {
  readonly kind: "seq";
  readonly items: readonly Doc[];
  readonly tag?: string;
}

export interface DocScalar {
  readonly kind: "scalar";
  readonly value: string;
  readonly style: ScalarStyle;
  readonly tag?: string;
}

/** An ordered, style-annotated tree. A YAML superset; a map is entries, never a record. */
export type Doc = DocMap | DocSeq | DocScalar;

/** Brand carried by a leaf object that knows how to become its own node. */
export const DOC: unique symbol = Symbol("ci-cdk/doc");

/**
 * Type markers. A scalar's text cannot say whether it came from a `null` or from the string
 * `"null"`, so the boundary parser tags the literal and the emitter resolves the tag back to a typed
 * value. The tag never reaches the output: an unquoted `null` already says what it is.
 */
export const NULL_TAG: string = "!!null";

/** Boolean counterpart of `NULL_TAG`. */
export const BOOL_TAG: string = "!!bool";

/**
 * String counterpart of `NULL_TAG`, carried only when the text would otherwise read as a number.
 * `1.5` is both a legal number and a legal string; without the marker the emitter has no way to keep
 * the string a string. The marker resolves to a quoted scalar and is never emitted as a tag.
 */
export const STRING_TAG: string = "!!str";

export interface LeafNode {
  readonly [DOC]: () => Doc;
  /** Debugging only; core never calls it. */
  readonly toString?: () => string;
}

/**
 * A field that may hold plain text or a leaf that decides its own scalar style. It is provider-neutral
 * because it only names the two shapes a scalar can enter the tree as.
 */
export type Text = string | LeafNode;

export interface ScalarOptions {
  readonly style?: ScalarStyle;
  readonly tag?: string;
}

export const map = (entries: readonly DocEntry[]): DocMap => ({ kind: "map", entries });

export const seq = (items: readonly Doc[]): DocSeq => ({ kind: "seq", items });

/**
 * A scalar is text plus the style that presents it; it is never a typed value. `scalar("true")` is
 * the string, not the boolean, so typed leaves enter the tree through `fromValue`. Two styles cannot
 * always survive directly: a `single`-quoted value holding a newline is emitted double-quoted,
 * because single quotes would only fold it and the format permits no blank lines.
 */
export const scalar = (value: string, options?: ScalarOptions): DocScalar => {
  const style = options?.style ?? "plain";
  const tag = options?.tag;

  if (tag === undefined) {
    return { kind: "scalar", value, style };
  }

  return { kind: "scalar", value, style, tag };
};

/** Shell text and anything else that must keep its newlines. */
export const block = (text: string): DocScalar => scalar(text, { style: "literal" });

/** Sets the tag on a node without introducing a fourth node kind. */
export const tagged = (tag: string, node: Doc): Doc => {
  switch (node.kind) {
    case "map":
      return { kind: "map", entries: node.entries, tag };

    case "seq":
      return { kind: "seq", items: node.items, tag };

    case "scalar":
      return { kind: "scalar", value: node.value, style: node.style, tag };
  }
};
