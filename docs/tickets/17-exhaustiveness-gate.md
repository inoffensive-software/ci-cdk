# 17: Exhaustiveness gate and inventory fixture

**Spec:** `docs/specs/0003-github-actions-breadth.md`

**What to build:** A test-only gate that answers, mechanically, which corpus keys the DSL cannot emit.
One inventory definition exercises every modelled key; rendering and parsing it produces the modelled
key-path set. Every vendored config is walked the same way, and any corpus path outside the modelled
set must be a `raw` path its fixture declares, or the suite fails with the path and the two remedies.
Green over `got` and `anyhow` with an empty ledger.

**Blocked by:** 16 (Retire byte-for-byte comparison)

**Status:** ready-for-agent

- [ ] One inventory definition sets every modelled key at every level, including every union arm that
      one document can express, and uses no `raw`.
- [ ] The inventory's rendered output validates against the vendored schema.
- [ ] The modelled set is derived by rendering the inventory with the header suppressed, parsing the
      output, and collecting key paths: map keys by name, sequence positions normalised to one
      position, children of author-named maps normalised to a wildcard.
- [ ] The author-named parent paths are declared in one list, and every declared path is asserted to
      occur in the inventory, so a typo cannot silently exclude a subtree.
- [ ] For each corpus entry, corpus key paths minus modelled paths equals exactly the `raw` paths that
      entry's fixture declares; otherwise the gate fails naming the path.
- [ ] `raw` on a key the inventory contains fails, proving the gate is not vacuous.
- [ ] A declared ledger row that no fixture uses still fails.
- [ ] The failure report is sorted and de-duplicated, and is asserted as a set of paths rather than a
      message string.
- [ ] The gate runs inside the normal test suite and is provider-local test code; nothing is exported
      from the package and no production module changes.
- [ ] `pnpm check` passes.
