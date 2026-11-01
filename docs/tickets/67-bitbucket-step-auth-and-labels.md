# 67: Step auth and pipeline labels

**Spec:** `docs/specs/0008-bitbucket-grammar-completion.md`

**What to build:** the two schema keys with no config and no documentation: `step.auth.system.scopes` and the top-level `labels` map. Both are schema-derived and marked unproven.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `Step` gains `auth?: { system?: { scopes?: readonly Text[] } }`, emitted in its alphabetical position, with `system` then `scopes` and absent keys omitted.
- [x] `PipelineConfig` gains `labels?: Readonly<Record<string, Text>>`, emitted after `image` and before `options`, in author order.
- [x] An empty scope list is refused at its path; labels are author data with no fixed keys.
- [x] Both shapes are schema-derived: no corpus config and no Atlassian page documents them. The
      inventory exercises them, the documented-grammar rows leave GAPS, and the stale-row check is
      empty; the provider page marks them unproven in the close-out (ticket 65).
- [x] The provider page's generated blocks are regenerated at the phase close-out (ticket 65),
      which also rewrites Non-goals; this slice leaves the page to that pass.
- [x] Goldens are added; no unrelated golden changes.
- [x] `pnpm check` passes.
