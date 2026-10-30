/**
 * The provider-neutral half of the corpus gate: the set differences over a corpus walk, a modelled
 * inventory and a declaration ledger, plus the failure text. Each provider supplies the pieces only
 * it knows, a key-path normalisation and a ledger notation, so the rules are stated once and no
 * provider can weaken them by accident.
 */

/** One inventory entry, rendered by the caller through the provider's own render. */
interface InventoryOptions<Fixture> {
  /** The definitions that between them exercise every key the vocabulary can emit. */
  readonly fixtures: readonly Fixture[];
  /** Renders one entry exactly as a consumer's document. */
  readonly renderOf: (fixture: Fixture) => string;
  /** The provider's normalisation of rendered text into key paths. */
  readonly keyPaths: (text: string) => readonly string[];
}

/**
 * How one provider writes its ledger rows and where its author data sits, so the gate can compare a
 * declaration with a corpus path.
 */
export interface LedgerRules {
  /** Maps a ledger row to the modelled position it stands in for. */
  readonly translate: (ledgerPath: string) => string;
  /**
   * Whether a declared row already accounts for a path. A row names one position unless it supplies
   * this, which is what lets a provider whose `raw` entry owns a whole map declare the map once.
   */
  readonly covers?: (declared: string, path: string) => boolean;
  /** Author data, which never needs a declaration and never counts as a gap. */
  readonly isAuthorData?: (path: string) => boolean;
}

/** Sorted and de-duplicated, because two entries reaching for the same missing key are one gap. */
export const unique = (paths: readonly string[]): readonly string[] =>
  [...new Set(paths)].toSorted();

/**
 * A declared row owns its whole subtree, so one row explains every key under a map it names. The
 * segment boundary matters: `$.variables` must not explain `$.variables_extra`.
 */
export const coversSubtree = (declared: string, path: string): boolean =>
  path === declared || path.startsWith(`${declared}.`) || path.startsWith(`${declared}[`);

const isAuthorData = (path: string, rules: LedgerRules): boolean =>
  rules.isAuthorData?.(path) ?? false;

const coversWith = (declared: string, path: string, rules: LedgerRules): boolean =>
  rules.covers === undefined ? declared === path : rules.covers(declared, path);

/** The modelled set: the union of the inventory documents' paths, rendered and normalised as a consumer's. */
export const inventoryPaths = <Fixture>({
  fixtures,
  renderOf,
  keyPaths,
}: InventoryOptions<Fixture>): readonly string[] =>
  unique(fixtures.flatMap((fixture) => keyPaths(renderOf(fixture))));

/** The positions a ledger declares, in the notation the corpus walk produces. */
const declaredPositions = (declared: readonly string[], rules: LedgerRules): readonly string[] =>
  declared.flatMap((row) => {
    const path = rules.translate(row);

    return isAuthorData(path, rules) ? [] : [path];
  });

/** Corpus paths the vocabulary cannot emit and the fixture does not declare through `raw`. */
export const gapPaths = (
  corpus: readonly string[],
  modelled: readonly string[],
  declared: readonly string[],
  rules: LedgerRules,
): readonly string[] => {
  const rows = declaredPositions(declared, rules);
  const known = new Set([...modelled, ...rows]);

  return unique(
    corpus.filter(
      (path) =>
        !isAuthorData(path, rules) &&
        !known.has(path) &&
        !rows.some((row) => coversWith(row, path, rules)),
    ),
  );
};

/** Declared gaps the corpus does not need, which would let a row rot without failing. */
export const unusedLedgerPaths = (
  corpus: readonly string[],
  declared: readonly string[],
  rules: LedgerRules,
): readonly string[] =>
  unique(
    declared.flatMap((row) => {
      const path = rules.translate(row);

      if (isAuthorData(path, rules) || corpus.some((entry) => coversWith(path, entry, rules))) {
        return [];
      }

      return [path];
    }),
  );

/** `raw` that stands in for a key the inventory already models; the gate treats this as a failure. */
export const filledRawPaths = (
  rawPaths: readonly string[],
  modelled: readonly string[],
  rules: LedgerRules,
): readonly string[] => {
  const known = new Set(modelled);

  return unique(
    rawPaths.flatMap((row) => {
      const path = rules.translate(row);

      return !isAuthorData(path, rules) && known.has(path) ? [path] : [];
    }),
  );
};

/** The failure text a reader needs: the path, and both ways to make it legal. */
export const remediesFor = (path: string): string =>
  `${path} is not modelled; model it in the vocabulary, or express it through raw and declare it in the ledger`;
