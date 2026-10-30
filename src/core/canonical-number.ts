/**
 * The one canonical-number predicate, shared by the boundary parser and the emitter so the two can
 * never disagree about which text is a number.
 *
 * Canonical means `String(Number(text))` spells the text back exactly: `1.1` is canonical, while
 * `1.10`, `01` and `1e3` are not, because a number would lose their spelling. A canonical string is
 * the only text that could be mistaken for a number, so it is the only text that needs tagging.
 */
const NUMBER_LITERAL = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/u;

/** The finite number `value` canonically spells, or undefined when it is not a canonical number. */
export const canonicalNumber = (value: string): number | undefined => {
  if (!NUMBER_LITERAL.test(value)) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || String(parsed) !== value) {
    return undefined;
  }

  return parsed;
};
