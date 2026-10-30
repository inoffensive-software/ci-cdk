# 32: The documented-grammar section in the provider document

**Spec:** `docs/specs/0005-documented-grammar-coverage.md`

**What to build:** The provider document states its documented-grammar coverage, generated from the
walker's output and the two declared lists, alongside the corpus coverage it already carries. A reader
sees what the provider cannot emit and why, in the same file as the claim it qualifies.

**Blocked by:** 31 (Triage the first report)

**Status:** ready-for-agent

- [ ] `docs/providers/github-actions.md` gains a generated section with the count of documented paths,
      the gaps grouped by category, and the overclaims, each in a table with its reason.
- [ ] The section is produced by one function over the walker's paths and the two lists, and a test
      compares the marked block with that function's output byte for byte.
- [ ] Every declared gap and overclaim appears in the document, asserted by a test, so a list row cannot
      be invisible.
- [ ] The prose note about `image_version` in the non-goals is removed, because the overclaim table is
      now its home.
- [ ] The section names the schema's pinned origin by linking `docs/references/upstream-schemas.md`
      rather than restating the URL or date.
- [ ] The document still does not restate invariants, the emitted format or decisions that belong in
      `docs/architecture.md`.
- [ ] `pnpm check` passes.
