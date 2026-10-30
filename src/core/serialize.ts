import { Document, Pair, Scalar, YAMLMap, YAMLSeq, type Node } from "yaml";

import type { Doc, DocMap, DocScalar, DocSeq, ScalarStyle } from "./doc.js";
import { fail } from "./errors.js";

export interface RenderOptions {
  /** One line, without the leading `# `. An empty string omits the header entirely. */
  readonly header?: string;
}

/** One target's byte format. A second target is another implementation, never a fork. */
export interface Serializer {
  render(doc: Doc, options: RenderOptions): string;
}

const YAML_OPTIONS = {
  lineWidth: 0,
  indent: 2,
  indentSeq: true,
  aliasDuplicateObjects: false,
} as const;

const NUMBER_LITERAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u;
const YAML_11_BOOLEAN = /^(?:y|n|yes|no|on|off)$/iu;
const MULTILINE = /[\r\n]/u;

/** `1.1` stays a number; `1.10` is already a string and must stay one. */
const canonicalNumber = (value: string): number | undefined => {
  if (!NUMBER_LITERAL.test(value)) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || String(parsed) !== value) {
    return undefined;
  }

  return parsed;
};

const plainScalar = (value: string): Scalar => {
  const numeric = canonicalNumber(value);

  if (numeric !== undefined) {
    return new Scalar(numeric);
  }

  // `DocScalar.value` is text, so the boolean `true` from `fromValue` and the string "true" are the
  // same node. The literal wins: the leaf must emit as a boolean. Strings that only YAML 1.1 reads
  // as booleans (`yes`, `no`) are still quotable, which is the trap the goldens pin.
  if (value === "true" || value === "false") {
    return new Scalar(value === "true");
  }

  if (value === "null") {
    return new Scalar(null);
  }

  const node = new Scalar(value);

  // A plain scalar holding a newline folds into a blank line, which the format does not allow.
  node.type =
    YAML_11_BOOLEAN.test(value) || MULTILINE.test(value) ? Scalar.QUOTE_DOUBLE : Scalar.PLAIN;

  return node;
};

const scalarType = (style: Exclude<ScalarStyle, "plain">): Scalar.Type => {
  switch (style) {
    case "single":
      return Scalar.QUOTE_SINGLE;

    case "double":
      return Scalar.QUOTE_DOUBLE;

    case "literal":
      return Scalar.BLOCK_LITERAL;

    case "folded":
      return Scalar.BLOCK_FOLDED;
  }
};

const toScalar = (doc: DocScalar): Scalar => {
  // Single quotes cannot escape a newline: they fold it, which emits a blank line. Double can.
  const style = doc.style === "single" && MULTILINE.test(doc.value) ? "double" : doc.style;
  const node = style === "plain" ? plainScalar(doc.value) : new Scalar(doc.value);

  if (style !== "plain") {
    node.type = scalarType(style);
  }

  if (doc.tag !== undefined) {
    node.tag = doc.tag;
  }

  return node;
};

const toMap = (doc: DocMap): YAMLMap => {
  const node = new YAMLMap();

  node.items = doc.entries.map((entry) => new Pair(entry.key, toNode(entry.value)));

  if (doc.tag !== undefined) {
    node.tag = doc.tag;
  }

  return node;
};

const toSeq = (doc: DocSeq): YAMLSeq => {
  const node = new YAMLSeq();

  node.items = doc.items.map((item) => toNode(item));

  if (doc.tag !== undefined) {
    node.tag = doc.tag;
  }

  return node;
};

const toNode = (doc: Doc): Node => {
  switch (doc.kind) {
    case "map":
      return toMap(doc);

    case "seq":
      return toSeq(doc);

    case "scalar":
      return toScalar(doc);

    default:
      // Reachable only when a leaf's DOC method returned something that is not a Doc.
      return fail({
        path: "$",
        message: "a leaf returned a value that is not a Doc",
        hint: "the DOC method must return a map, seq or scalar node",
      });
  }
};

const buildDocument = (doc: Doc, header: string): Document => {
  const document = new Document();
  const root = toNode(doc);

  document.contents = root;

  if (header !== "") {
    root.commentBefore = ` ${header}`;
  }

  return document;
};

export const yamlSerializer: Serializer = {
  render: (doc: Doc, options: RenderOptions): string =>
    buildDocument(doc, options.header ?? "").toString(YAML_OPTIONS),
};
