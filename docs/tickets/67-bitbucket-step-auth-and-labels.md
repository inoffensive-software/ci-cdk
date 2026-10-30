# 67: Step auth and pipeline labels

**Spec:** `docs/specs/0008-bitbucket-grammar-completion.md`

**What to build:** the two schema keys with no config and no documentation: `step.auth.system.scopes` and the top-level `labels` map. Both are schema-derived and marked unproven.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `Step` gains `auth?: { system?: { scopes?: readonly Text[] } }`, emitted in its alphabetical position, with `system` then `scopes` and absent keys omitted.
- [ ] `PipelineConfig` gains `labels?: Readonly<Record<string, Text>>`, emitted after `image` and before `options`, in author order.
- [ ] An empty scope list is refused at its path; labels are author data with no fixed keys.
- [ ] Both shapes are schema-derived: no corpus config and no Atlassian page documents them, and the PR body says so. The inventory exercises them, the documented-grammar rows leave GAPS, and the stale-row check is empty.
- [ ] The provider page's generated blocks are regenerated; Non-goals and other prose are untouched.
- [ ] Goldens are added; no unrelated golden changes.
- [ ] `pnpm check` passes.
