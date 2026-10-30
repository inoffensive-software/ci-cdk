import {
  BOOL_TAG,
  DOC,
  NULL_TAG,
  map,
  scalar,
  seq,
  type Doc,
  type DocEntry,
  type LeafNode,
} from "./doc.js";
import { fail, type Diagnostic } from "./errors.js";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

const isLeafNode = (value: unknown): value is LeafNode => {
  if (typeof value !== "object" && typeof value !== "function") {
    return false;
  }

  if (value === null) {
    return false;
  }

  // Own brand only: an inherited symbol (say, from a polluted prototype) must not dispatch.
  return Object.hasOwn(value, DOC);
};

const childPath = (path: string, key: string): string => {
  if (IDENTIFIER.test(key)) {
    return `${path}.${key}`;
  }

  return `${path}[${JSON.stringify(key)}]`;
};

const reject = (
  diagnostics: Diagnostic[],
  path: string,
  diagnostic: { readonly message: string; readonly hint?: string },
): Doc => {
  if (diagnostic.hint === undefined) {
    diagnostics.push({ path, message: diagnostic.message });
  } else {
    diagnostics.push({ path, message: diagnostic.message, hint: diagnostic.hint });
  }

  return scalar("");
};

const lowerNumber = (value: number, path: string, diagnostics: Diagnostic[]): Doc => {
  if (!Number.isFinite(value)) {
    return reject(diagnostics, path, {
      message: `${String(value)} is not a finite number`,
      hint: "pass a finite number, or the string you meant to keep",
    });
  }

  return scalar(String(value));
};

const lowerArray = (
  items: readonly unknown[],
  path: string,
  ancestors: readonly object[],
  diagnostics: Diagnostic[],
): Doc => {
  if (ancestors.includes(items)) {
    return reject(diagnostics, path, {
      message: "circular reference: this array contains itself",
      hint: "remove the cycle, or flatten the data before lowering it",
    });
  }

  const chain = [...ancestors, items];
  const lowered = items.map((item, index) => lower(item, `${path}[${index}]`, chain, diagnostics));

  return seq(lowered);
};

const lowerObject = (
  value: unknown,
  path: string,
  ancestors: readonly object[],
  diagnostics: Diagnostic[],
): Doc => {
  if (ancestors.includes(value as object)) {
    return reject(diagnostics, path, {
      message: "circular reference: this object contains itself",
      hint: "remove the cycle, or flatten the data before lowering it",
    });
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    return reject(diagnostics, path, {
      message: `${describeUnsupported(value)} is not plain data`,
      hint: "use only plain objects, arrays, strings, finite numbers, booleans and null",
    });
  }

  const chain = [...ancestors, value as object];
  const entries: DocEntry[] = [];

  for (const [key, child] of Object.entries(value as object)) {
    entries.push({ key, value: lower(child, childPath(path, key), chain, diagnostics) });
  }

  return map(entries);
};

const describeUnsupported = (value: unknown): string => {
  if (value instanceof Date) {
    return "a Date";
  }

  if (value instanceof Map) {
    return "a Map";
  }

  if (value instanceof Set) {
    return "a Set";
  }

  const name = (value as { readonly constructor?: { readonly name?: string } }).constructor?.name;

  if (name === undefined || name === "" || name === "Object") {
    return "this object";
  }

  return `an instance of ${name}`;
};

/** The `typeof` cases that have no text form. Split out so the dispatch below stays flat. */
const lowerUnsupported = (input: unknown, path: string, diagnostics: Diagnostic[]): Doc => {
  if (input === undefined) {
    return reject(diagnostics, path, {
      message: "undefined is not a value",
      hint: "omit the key, or call omitUndefined at the call site",
    });
  }

  if (typeof input === "function") {
    return reject(diagnostics, path, {
      message: "functions cannot be emitted",
      hint: "call the function and pass its result",
    });
  }

  if (typeof input === "symbol") {
    return reject(diagnostics, path, {
      message: "symbols cannot be emitted",
      hint: "symbol keys are ignored; symbol values have no text form",
    });
  }

  return reject(diagnostics, path, {
    message: "bigint is not supported",
    hint: "convert it to a string or a safe number first",
  });
};

const isDocNode = (value: unknown): value is Doc => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const kind: unknown = (value as { readonly kind?: unknown }).kind;

  return kind === "map" || kind === "seq" || kind === "scalar";
};

const lowerLeaf = (leaf: LeafNode, path: string, diagnostics: Diagnostic[]): Doc => {
  const lowered: unknown = leaf[DOC]();

  if (!isDocNode(lowered)) {
    return reject(diagnostics, path, {
      message: "a leaf returned a value that is not a Doc",
      hint: "the DOC method must return a map, seq or scalar node",
    });
  }

  return lowered;
};

const lower = (
  input: unknown,
  path: string,
  ancestors: readonly object[],
  diagnostics: Diagnostic[],
): Doc => {
  if (isLeafNode(input)) {
    return lowerLeaf(input, path, diagnostics);
  }

  // null and booleans are tagged because their text is also a legal string: without the marker the
  // string "null" and the null literal would be the same node by the time the emitter sees it.
  if (input === null) {
    return scalar("null", { tag: NULL_TAG });
  }

  if (typeof input === "string") {
    return scalar(input);
  }

  if (typeof input === "boolean") {
    return scalar(input ? "true" : "false", { tag: BOOL_TAG });
  }

  if (typeof input === "number") {
    return lowerNumber(input, path, diagnostics);
  }

  if (typeof input === "object") {
    if (Array.isArray(input)) {
      return lowerArray(input, path, ancestors, diagnostics);
    }

    return lowerObject(input, path, ancestors, diagnostics);
  }

  return lowerUnsupported(input, path, diagnostics);
};

/**
 * The one boundary parser: `unknown` in, `Doc` out. Never infers scalar style, never sorts keys,
 * never drops a key. Collects every problem it can find before throwing.
 */
export const fromValue = (input: unknown): Doc => {
  const diagnostics: Diagnostic[] = [];
  const doc = lower(input, "$", [], diagnostics);

  if (diagnostics.length > 0) {
    fail(...diagnostics);
  }

  return doc;
};
