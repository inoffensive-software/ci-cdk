import type { DocEntry } from "./doc.js";
import { DiagnosticError, type Diagnostic } from "./errors.js";
import { fromValue } from "./from-value.js";
import { type KeyPathFormatter, keyPath, rebase } from "./paths.js";
import type { Value } from "./value.js";

/**
 * The raw block as entries, or none when the boundary refused it. Lowering the whole block at once
 * is what makes the container itself checked: a cast that passes a `Map`, a `Set` or an array is
 * reported, not silently dropped.
 */
export const lowerRawBlock = (
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
 *
 * `formatCollision` decides how the refused key is named, because the providers document their paths
 * differently: it is the caller's notation, not a behaviour of this module.
 */
export const rawEntries = (
  path: string,
  raw: Readonly<Record<string, Value>> | undefined,
  modelled: readonly DocEntry[],
  diagnostics: Diagnostic[],
  reserved: readonly string[] = [],
  formatCollision: KeyPathFormatter = keyPath,
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
        path: formatCollision(rawPath, item.key),
        message: `raw key "${item.key}" is already emitted at this level`,
        hint: "use the modelled field, or remove the raw entry",
      });
      continue;
    }

    kept.push(item);
  }

  return kept;
};
