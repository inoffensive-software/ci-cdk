/**
 * What each `$ref` target contributed at its first occurrence, as suffixes of the path that
 * occurrence sat at. A recursive schema repeats a target's shape one level down, so a repeat replays
 * these under its own prefix instead of contributing nothing, and each target still expands once.
 */
export interface RefMemo {
  readonly suffixes: Map<string, readonly string[]>;
  /** Repeats met while their target was expanding, replayed once its suffixes are known. */
  readonly deferred: { readonly ref: string; readonly path: string }[];
}

/** An empty memo, so the walk's state is built in one literal. */
export const refMemo = (): RefMemo => ({ suffixes: new Map(), deferred: [] });

/** Adds a target's recorded shape under a repeat's prefix. */
export const replayRef = (memo: RefMemo, paths: Set<string>, ref: string, path: string): void => {
  for (const suffix of memo.suffixes.get(ref) ?? []) {
    paths.add(`${path}${suffix}`);
  }
};

/** Records what an expansion contributed, as suffixes; only a target's first expansion counts. */
export const recordRef = (
  memo: RefMemo,
  ref: string,
  path: string,
  paths: Set<string>,
  before: ReadonlySet<string>,
): void => {
  if (memo.suffixes.has(ref)) {
    return;
  }

  memo.suffixes.set(
    ref,
    [...paths].flatMap((produced) => (before.has(produced) ? [] : [produced.slice(path.length)])),
  );
};

/**
 * Replays the repeats met while their target was expanding. A repeat whose suffixes are still
 * unknown contributes nothing, and waits here for the next expansion to finish.
 */
export const drainRefs = (memo: RefMemo, paths: Set<string>): void => {
  for (const entry of memo.deferred.splice(0)) {
    if (memo.suffixes.has(entry.ref)) {
      replayRef(memo, paths, entry.ref, entry.path);
    } else {
      memo.deferred.push(entry);
    }
  }
};
