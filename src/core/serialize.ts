import { Document, Pair, Scalar, YAMLMap, YAMLSeq, type Node } from "yaml";

import {
  BOOL_TAG,
  NULL_TAG,
  type Doc,
  type DocMap,
  type DocScalar,
  type DocSeq,
  type ScalarStyle,
} from "./doc.js";
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
  // Long double-quoted scalars otherwise fold across physical lines with blank lines between them,
  // which the format contract forbids. JSON escaping keeps them on one line and round-trips exactly.
  doubleQuotedAsJSON: true,
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

/**
 * Resolves a type marker back to a typed value. `fromValue` reduces `null` and booleans to text, so
 * the tag is the only thing that separates the literal from the string that spells it. Returns
 * undefined when the tag is not a marker, so a tag the caller wrote still emits.
 */
const typedScalar = (doc: DocScalar): Scalar | undefined => {
  if (doc.style !== "plain") {
    return undefined;
  }

  if (doc.tag === NULL_TAG && doc.value === "null") {
    return new Scalar(null);
  }

  if (doc.tag === BOOL_TAG && (doc.value === "true" || doc.value === "false")) {
    return new Scalar(doc.value === "true");
  }

  return undefined;
};

const plainScalar = (value: string): Scalar => {
  const numeric = canonicalNumber(value);

  if (numeric !== undefined) {
    return new Scalar(numeric);
  }

  const node = new Scalar(value);

  // A plain scalar holding a newline folds into a blank line, which the format does not allow.
  // `yes`/`no`/`on`/`off` are strings under YAML 1.2 and booleans under 1.1, so they are quoted
  // rather than left to the schema; everything else is quoted by the serializer when its text would
  // not read back as itself.
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
  const typed = typedScalar(doc);
  // Single quotes cannot escape a newline: they fold it, which emits a blank line. Double can.
  const style = doc.style === "single" && MULTILINE.test(doc.value) ? "double" : doc.style;
  const node = typed ?? (style === "plain" ? plainScalar(doc.value) : new Scalar(doc.value));

  if (typed === undefined && style !== "plain") {
    node.type = scalarType(style);
  }

  // A type marker is implied by the value it emits, so it is never repeated as a tag in the output.
  if (typed === undefined && doc.tag !== undefined) {
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
