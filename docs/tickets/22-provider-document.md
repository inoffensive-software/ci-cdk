# 22: Provider document and the empty-ledger assertion

**Spec:** `docs/specs/0003-github-actions-breadth.md`

**What to build:** The provider's claim lives where the provider template says it does, and the claim
is generated from evidence. `docs/providers/github-actions.md` states scope, coverage, corpus, quirks,
non-goals and open gaps; its coverage table comes from the exhaustiveness gate's data and is compared
with the document in a test; open gaps are the ledger. A named test asserts the ledger is empty, which
is the definition of provider done.

**Blocked by:** 19 (Release entry), 20 (Reusable-workflow entry), 21 (Container entry)

**Status:** done

- [x] `docs/providers/github-actions.md` follows the sections in `docs/providers/README.md` and does
      not restate invariants, the emitted format or decisions that belong in the architecture.
- [x] The coverage table is produced by one function over the gate's data, and a test asserts the
      document's table equals that function's output, so editing it by hand fails.
- [x] The corpus section lists all six entries with repo and commit, and the open-gaps section is
      sourced from the ledger rather than written separately.
- [x] A named test asserts the ledger is empty and fails with the remaining paths when it is not.
- [x] The document links to the corpus tests for its coverage claims rather than restating them as
      prose.
- [x] `pnpm check` passes.
