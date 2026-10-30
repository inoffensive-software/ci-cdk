# 16: Retire byte-for-byte comparison

**Spec:** `docs/specs/0003-github-actions-breadth.md`

**What to build:** `got` compares as parsed data like every other corpus entry. Its two `raw.run` steps
become modelled `run` steps, the coverage ledger holds one kind of row (a vocabulary gap), and the
record that changes ADR 0005 exists. After this, "a fixture uses `raw`" and "the vocabulary cannot
express the key" are the same statement, which is what the exhaustiveness gate needs.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] ADR 0007 records the decision, names the byte-equality retention clause of ADR 0005 and the
      two-row-kind description in the corpus README and the ledger's docstring as the anchors it
      supersedes, and states that everything else in ADR 0005 stands.
- [ ] `got`'s fixture expresses both `run` steps through the modelled field, and its corpus test
      asserts data equality only.
- [ ] `PROVENANCE.md` records `data` for `got`, and the corpus README no longer claims any entry is
      compared byte for byte.
- [ ] The ledger contains no byte-fidelity rows and its docstring describes exactly one kind of row.
- [ ] `got` still round-trips, and the ledger's set-equality tests pass with an empty list.
- [ ] `pnpm check` passes.
