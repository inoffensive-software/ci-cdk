/**
 * Groups items by a caller-supplied key and keeps only the keys claimed more than once, each with
 * every position it occupies. Keys come back in the order they were first claimed, so a caller can
 * report in document order without sorting.
 */
export const duplicatesBy = <T>(
  items: readonly T[],
  keyOf: (item: T) => string,
): ReadonlyMap<string, readonly number[]> => {
  const positions = new Map<string, number[]>();

  for (const [index, item] of items.entries()) {
    const key = keyOf(item);
    const found = positions.get(key);

    if (found === undefined) {
      positions.set(key, [index]);
    } else {
      found.push(index);
    }
  }

  for (const [key, indexes] of positions) {
    if (indexes.length < 2) {
      positions.delete(key);
    }
  }

  return positions;
};
