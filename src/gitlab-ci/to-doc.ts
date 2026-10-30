import {
  DiagnosticError,
  fail,
  fromValue,
  map,
  type Diagnostic,
  type Doc,
  type DocEntry,
  type Value,
} from "../core/index.js";
import type { Job, Pipeline } from "./types.js";
import { validate } from "./validate.js";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

/** Job keys that are struct identity or already modelled at this level, so raw may not repeat them. */
const JOB_RESERVED: readonly string[] = ["name", "stage", "script"];

/** The core path notation, repeated so a raw diagnostic points at what the author wrote. */
const keyPath = (path: string, key: string): string =>
  IDENTIFIER.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;

/** A raw key is author data, so a collision quotes it exactly as written. */
const rawKeyPath = (rawPath: string, key: string): string => `${rawPath}[${JSON.stringify(key)}]`;

/** `fromValue` reports from `$`; re-root its paths at the raw block it was given. */
const rebase = (prefix: string, diagnostic: Diagnostic): Diagnostic =>
  diagnostic.hint === undefined
    ? { path: `${prefix}${diagnostic.path.slice(1)}`, message: diagnostic.message }
    : {
        path: `${prefix}${diagnostic.path.slice(1)}`,
        message: diagnostic.message,
        hint: diagnostic.hint,
      };

/**
 * The raw block as entries, or none when the boundary refused it. Lowering the whole block at once
 * is what makes the container itself checked: a cast that passes a `Map`, a `Set` or an array is
 * reported, not silently dropped.
 */
const lowerRawBlock = (
  raw: Readonly<Record<string, Value>>,
  rawPath: string,
  diagnostics: Diagnostic[],
): readonly DocEntry[] => {
  try {
    const doc = fromValue(raw);

    if (doc.kind !== "map") {
      diagnostics.push({ path: rawPath, message: "raw must be a plain record of keys to values" });

      return [];
    }

    return doc.entries;
  } catch (error) {
    if (!(error instanceof DiagnosticError)) {
      throw error;
    }

    diagnostics.push(...error.diagnostics.map((diagnostic) => rebase(rawPath, diagnostic)));

    return [];
  }
};

/**
 * Keys the vocabulary does not model, appended after the modelled keys at their own level. A key
 * that is already emitted here, or that the struct owns, is refused rather than duplicated.
 *
 * Author order holds for every key a JavaScript record keeps in insertion order; integer-like keys
 * sort first, as they do everywhere else in this library.
 */
const rawEntries = (
  path: string,
  raw: Readonly<Record<string, Value>> | undefined,
  modelled: readonly DocEntry[],
  diagnostics: Diagnostic[],
  reserved: readonly string[] = [],
): readonly DocEntry[] => {
  if (raw === undefined) {
    return [];
  }

  const rawPath = keyPath(path, "raw");
  const taken = new Set([...modelled.map((entry) => entry.key), ...reserved]);
  const kept: DocEntry[] = [];

  for (const item of lowerRawBlock(raw, rawPath, diagnostics)) {
    if (taken.has(item.key)) {
      diagnostics.push({
        path: rawKeyPath(rawPath, item.key),
        message: `raw key "${item.key}" is already emitted at this level`,
        hint: "use the modelled field, or remove the raw entry",
      });
      continue;
    }

    kept.push(item);
  }

  return kept;
};

/** Only a declared field with a value is emitted; absent fields are not lowered at all. */
const entry = (key: string, value: Doc | undefined): readonly DocEntry[] =>
  value === undefined ? [] : [{ key, value }];

/** `stage` when set, then `script`, then raw. `name` is struct identity and never enters the body. */
const jobDoc = (item: Job, path: string, diagnostics: Diagnostic[]): Doc => {
  const modelled = [
    ...entry("stage", item.stage === undefined ? undefined : fromValue(item.stage)),
    { key: "script", value: fromValue(item.script) },
  ];

  return map([...modelled, ...rawEntries(path, item.raw, modelled, diagnostics, JOB_RESERVED)]);
};

/**
 * Validates the whole document, then lowers it. `jobs` is an array on the struct so composition is
 * spread and concat; it becomes a map keyed by name here, in array order, with `name` stripped from
 * the body. Raw entries come last at each level.
 */
export const toDoc = (pipeline: Pipeline): Doc => {
  const diagnostics: Diagnostic[] = [...validate(pipeline)];

  const modelled = [
    ...entry("stages", pipeline.stages === undefined ? undefined : fromValue(pipeline.stages)),
    ...pipeline.jobs.map((item, index) => ({
      key: item.name,
      value: jobDoc(item, `$.jobs[${index}]`, diagnostics),
    })),
  ];

  const doc = map([
    ...modelled,
    ...rawEntries("$", pipeline.raw, modelled, diagnostics, [
      "stages",
      ...pipeline.jobs.map((item) => item.name),
    ]),
  ]);

  if (diagnostics.length > 0) {
    fail(...diagnostics);
  }

  return doc;
};
