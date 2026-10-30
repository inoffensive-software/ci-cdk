# 43: The `!reference` leaf

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** `ref(segments)`, the first GitLab leaf. It emits a sequence carrying the
`!reference` tag, so a templated script can be written as data and reused by any field that accepts
`Text` or `Scalar`. The public-surface widening is recorded in ADR 0012.

**Blocked by:** 40 (Job fundamentals).

**Status:** ready-for-agent

- [ ] `ref([".setup", "script"])` is exported from the provider barrel and returns a `LeafNode` whose
      `DOC` method returns a sequence tagged `!reference`.
- [ ] A reference renders as `!reference [.setup, script]` (exact bytes pinned by a golden) and parses
      back as the same tagged sequence GitLab expects.
- [ ] `ref` is accepted anywhere `Text` is accepted, including `script`, `before_script`,
      `after_script`, `image` and `variables` values, and inside script arrays.
- [ ] The referenced path is never resolved or validated; a path that names nothing still renders.
- [ ] ADR 0012 records the leaf as a widening of ADR 0008's surface, why a plain string cannot carry
      the tag, and that core is unchanged.
- [ ] `toDoc` exposes the tagged node for one structural test; bytes remain the primary assertion.
- [ ] `pnpm check` passes.
