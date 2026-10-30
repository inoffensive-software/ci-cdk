# 17: Exhaustiveness gate and inventory fixture

**Spec:** `docs/specs/0003-github-actions-breadth.md`

**What to build:** A test-only gate that answers, mechanically, which corpus keys the DSL cannot emit.
One inventory definition exercises every modelled key; rendering and parsing it produces the modelled
key-path set. Every vendored config is walked the same way, and any corpus path outside the modelled
set must be a `raw` path its fixture declares, or the suite fails with the path and the two remedies.
Green over `got` and `anyhow` with an empty ledger.

**Blocked by:** 16 (Retire byte-for-byte comparison)

**Status:** done

- [x] A small inventory set covers every modelled key at every level: one document for everything
      that can coexist, plus one document per shape that cannot (`on` as string, sequence and map;
      `permissions` as token and as map; both arms of `environment`, `concurrency`, `needs`,
      `runs-on` and `secrets`). The modelled set is the union of the set's key paths.
- [x] No inventory document uses `raw`, and every one renders to a document that validates against the
      vendored schema.
- [x] The modelled set is derived by rendering the inventory with the header suppressed, parsing the
      output, and collecting key paths: map keys by name, sequence positions normalised to one
      position, children of author-named maps normalised to a wildcard.
- [x] The author-named parent paths are declared in one list, and every declared path is asserted to
      occur in the inventory, so a typo cannot silently exclude a subtree.
- [x] For each corpus entry, corpus key paths minus modelled paths equals exactly the `raw` paths that
      entry's fixture declares; otherwise the gate fails naming the path.
- [x] `raw` on a key the inventory contains fails, proving the gate is not vacuous.
- [x] A declared ledger row that no fixture uses still fails.
- [x] The failure report is sorted and de-duplicated, and is asserted as a set of paths rather than a
      message string.
- [x] The gate runs inside the normal test suite and is provider-local test code; nothing is exported
      from the package and no production module changes.
- [x] The gate is green over `got` and `anyhow` with an empty ledger, so the gate and the corpus agree
      before any breadth is added.
- [x] `pnpm check` passes.
