# 112: Lock the completion target

**Spec:** `docs/specs/0009-gitlab-ci-grammar-completion.md`

**What to build:** The end state of the completion slice: the target asserted, the provider page
regenerated, and the gap report's remaining rows exactly the architectural non-goals plus schema noise.

**Blocked by:** 102-111.

**Status:** ready-for-agent

- [ ] Modelled schema paths are at least 928 of 1,061, or the shortfall is a declared row with a reason.
- [ ] `out-of-scope` contains only `$.spec` and the architectural non-goals; every other gap row is
      `unmodelled` with a reason or `schema-noise`.
- [ ] The provider page's documented-grammar and open-gaps sections are regenerated and byte-compared.
- [ ] The corpus ledger stays empty; the exhaustiveness gate and schema conformance are green.
- [ ] Final goldens pin the widened vocabulary; regenerating from unchanged source produces no diff.
- [ ] `pnpm check` passes.
