# 51: Bitbucket format contract lock

**Spec:** `docs/specs/0007-bitbucket-pipelines-provider.md`

**What to build:** Freeze the emitted bytes the way GitHub Actions and GitLab do, with the Bitbucket
shapes that would otherwise change silently: quoted selector patterns, the `step:`/`steps:`
distinction, a pipe inside a script sequence, and the alphabetical key order.

**Blocked by:** 47 (Composition items), 48 (Step vocabulary breadth)

**Status:** ready-for-agent

- [ ] A format-lock test pins the header line and its suppression, LF endings, exactly one trailing
      newline, and no blank lines outside a block scalar.
- [ ] `"*"` and `"**"` selector keys emit quoted and parse back as those strings, not as aliases or
      as the number zero.
- [ ] A stage emits `steps:` as its nested sequence, and a pipeline item emits `step:` as its single
      key; both are pinned in one golden.
- [ ] A pipe inside a script sequence emits as `- pipe: <id>` with `variables` indented beneath it,
      and the sequence's other items stay plain scalars.
- [ ] An empty `definitions.caches` and an empty `variables` map emit `{}`; an empty sequence path
      emits `[]` where the shape allows one.
- [ ] Document and step keys are emitted in the spec's alphabetical order, and the golden makes a
      reordering visible.
- [ ] Two renders of the same definition are byte-identical.
- [ ] Goldens are updated deliberately; a render from unchanged source produces no diff.
- [ ] `pnpm check` passes.
