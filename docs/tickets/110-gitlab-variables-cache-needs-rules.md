# 110: Variables, cache, needs and rules nesting

**Spec:** `docs/specs/0009-gitlab-ci-grammar-completion.md`

**What to build:** The remaining nested options: variable object forms (`value`, `expand`, `options`,
`description`), cache `files_commits`/`unprotect`, `needs.pipeline`/`project`/`ref`, and rule `exists`
variants.

**Blocked by:** 100 (Re-triage and target).

**Status:** ready-for-agent

- [ ] A variable value accepts a scalar or the documented object form at pipeline, job, service and
      rules level.
- [ ] Cache accepts `files_commits` and `unprotect`; needs accepts cross-project forms; rule `exists`
      accepts project/ref/regexp variants.
- [ ] Raw collisions cover every new key; absent values emit nothing.
- [ ] The inventory exercises each shape without raw; the corresponding gap rows are removed.
- [ ] Tests cover scalar/object variables, cache variants, and nested rule/need forms.
- [ ] `pnpm check` passes.
