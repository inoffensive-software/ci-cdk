# 105: Tokens and identity

**Spec:** `docs/specs/0009-gitlab-ci-grammar-completion.md`

**What to build:** `id_tokens` and `identity`, at job and default level.

**Blocked by:** 104 (Secrets).

**Status:** ready-for-agent

- [ ] `id_tokens` accepts the documented token map; `identity` accepts the documented identity map,
      both at job and `default` level.
- [ ] Job and default raw collide with the modelled keys.
- [ ] The inventory exercises both levels without raw; the `id_tokens` and `identity` gap rows are
      removed from the report.
- [ ] Fixtures are pinned or docs-derived, with provenance saying which.
- [ ] Tests cover both levels, absent values, and ordering.
- [ ] `pnpm check` passes.
