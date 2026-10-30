# 32: The documented-grammar section in the provider document

**Spec:** `docs/specs/0005-documented-grammar-coverage.md`

**What to build:** The provider document states its documented-grammar coverage, generated from the
walker's output and the two declared lists, alongside the corpus coverage it already carries. A reader
sees what the provider cannot emit and why, in the same file as the claim it qualifies.

**Blocked by:** 31 (Triage the first report)

**Status:** done

- [x] `docs/providers/github-actions.md` gains a generated section with the count of documented paths,
      the gaps grouped by category, and the overclaims, each in a table with its reason.
- [x] The section is produced by one function over the walker's paths and the two lists, and a test
      compares the marked block with that function's output byte for byte.
- [x] Every declared gap and overclaim appears in the document, asserted by a test, so a list row cannot
      be invisible.
- [x] The prose note about `image_version` in the non-goals stays, because the diff cannot see a
      vocabulary arm the inventory is forbidden to contain (spec decision 14), and the section says so
      in one line rather than implying the overclaim table covers it.
- [x] The section names the schema's pinned origin by linking `docs/references/upstream-schemas.md`
      rather than restating the URL or date.
- [x] The document still does not restate invariants, the emitted format or decisions that belong in
      `docs/architecture.md`.
- [x] `pnpm check` passes.
