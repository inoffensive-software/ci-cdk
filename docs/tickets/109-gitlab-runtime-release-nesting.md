# 109: Runtime and release nesting

**Spec:** `docs/specs/0009-gitlab-ci-grammar-completion.md`

**What to build:** The unmodelled children of runtime and release: `environment.kubernetes`,
`image.docker`/`kubernetes`, `services[].docker`/`kubernetes`/`pull_policy`, `release.assets` and
`release.tag_message`, at job and default level.

**Blocked by:** 100 (Re-triage and target).

**Status:** ready-for-agent

- [ ] Each shape is typed from the schema and GitLab docs, at job and default level where both support it.
- [ ] Raw collisions cover the new keys; absent values emit nothing.
- [ ] The inventory exercises each shape without raw; the corresponding gap rows are removed.
- [ ] Tests cover map variants, list variants, and ordering.
- [ ] `pnpm check` passes.
