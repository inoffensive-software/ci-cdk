import type { Diagnostic } from "./errors.js";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

/** A path segment formatter: given the parent path and a key, return the child path. */
export type KeyPathFormatter = (path: string, key: string) => string;

/**
 * The core path notation, so a diagnostic can be copied back into the config it came from. An
 * identifier-like key takes dot notation, anything else is quoted.
 */
export const keyPath = (path: string, key: string): string =>
  IDENTIFIER.test(key) ? `${path}.${key}` : `${path}[${JSON.stringify(key)}]`;

/**
 * Quoted notation for every key. Raw keys are author data with no identifier guarantee, so this
 * names them exactly as written and never implies a modelled field.
 */
export const rawKeyPath = (rawPath: string, key: string): string =>
  `${rawPath}[${JSON.stringify(key)}]`;

/** `fromValue` reports from `$`; re-root its paths at the raw block it was given. */
export const rebase = (prefix: string, diagnostic: Diagnostic): Diagnostic =>
  diagnostic.hint === undefined
    ? { path: `${prefix}${diagnostic.path.slice(1)}`, message: diagnostic.message }
    : {
        path: `${prefix}${diagnostic.path.slice(1)}`,
        message: diagnostic.message,
        hint: diagnostic.hint,
      };
