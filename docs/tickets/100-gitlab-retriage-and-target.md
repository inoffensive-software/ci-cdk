# 100: Re-triage and target

**Spec:** `docs/specs/0009-gitlab-ci-grammar-completion.md`

**What to build:** Move the deferred grammar from "out of scope" to debt, and record the target the rest
of the slice is measured against. No vocabulary.

**Blocked by:** none.

**Status:** ready-for-agent

- [ ] Every row in `schema-gap-debt.json` that names a deferred keyword becomes `unmodelled`, with a
      reason naming the keyword; `$.spec` and the architectural non-goals stay `out-of-scope`.
- [ ] A test or assertion states the target: 928 of 1,061 schema paths modelled, with the residual
      count (105 schema-noise, 28 `spec`) derived rather than hand-written.
- [ ] The provider page's documented-grammar section reflects the new categories and counts.
- [ ] `schema-gap.test.ts` keeps the stale-gap, orphaned-row and both-way assertions green.
- [ ] No vocabulary, corpus fixture, ledger row or golden changes.
- [ ] `pnpm check` passes.
