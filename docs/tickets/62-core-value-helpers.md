# 62: Core value helpers the providers keep re-writing

**Spec:** none (refactor found by the sharing sweep)

**What to build:** Three shapes every provider needs and each currently writes for itself: the
`entry(key, value | undefined)` guard, the `present` wrapper over `fromValue`, and the `Scalar` alias.
None of them names a provider, so all three belong in core.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `entry` is exported from core once and the six provider copies are deleted: GitHub Actions
      `to-doc`, GitLab `to-doc` and `blocks`, Bitbucket `to-doc`, `step-doc` and `item-doc`.
- [ ] `present` is exported from core once, over the same `Presentable` union, and the two copies are
      deleted.
- [ ] `Scalar` lives in core beside `Text`, with the two provider aliases removed and re-exported only
      if a provider barrel already publishes them. Spec 0003's "two providers is not three" bar is met;
      note the supersession in the ADR that decision lives in, or in a new one.
- [ ] Emitted bytes are unchanged and every golden still passes.
- [ ] `pnpm check` passes.
