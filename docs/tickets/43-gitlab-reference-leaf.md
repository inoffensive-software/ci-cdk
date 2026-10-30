# 43: The `!reference` leaf

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** `ref(segments)`, the first GitLab leaf. It emits a sequence carrying the
`!reference` tag, so a templated script can be written as data and reused by any field that accepts
`Text` or `Scalar`. The public-surface widening is recorded in ADR 0016.

**Blocked by:** 40 (Job fundamentals).

**Status:** done

- [x] `ref([".setup", "script"])` is exported from the provider barrel and returns a `LeafNode` whose
      `DOC` method returns a sequence tagged `!reference`.
- [x] A reference renders as a tagged `!reference` sequence (the serializer's block form, pinned by a golden)
      and parses back as the same tagged sequence GitLab expects.
- [x] `ref` is accepted anywhere `Text` is accepted, including `script`, `before_script`,
      `after_script`, `image` and `variables` values, and inside script arrays.
- [x] The referenced path is never resolved or validated; a path that names nothing still renders.
- [x] ADR 0016 records the leaf as a widening of ADR 0008's surface, why a plain string cannot carry
      the tag, and that core is unchanged.
- [x] `toDoc` exposes the tagged node for one structural test; bytes remain the primary assertion.
- [x] `pnpm check` passes.
