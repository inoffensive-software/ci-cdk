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

export interface LeafNode {
  readonly [DOC]: () => Doc;
}

export interface ScalarOptions {
  readonly style?: ScalarStyle;
  readonly tag?: string;
}

export const map = (entries: readonly DocEntry[]): DocMap => ({ kind: "map", entries });

export const seq = (items: readonly Doc[]): DocSeq => ({ kind: "seq", items });

/**
 * A scalar is text plus the style that presents it. Two styles cannot always survive directly: a
 * `single`-quoted value holding a newline is emitted double-quoted, because single quotes would only
 * fold it and the format permits no blank lines.
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
