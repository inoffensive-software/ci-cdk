# 108: Artifact reports

**Spec:** `docs/specs/0009-gitlab-ci-grammar-completion.md`

**What to build:** The remaining artifact report variants at job and default level.

**Blocked by:** 100 (Re-triage and target).

**Status:** ready-for-agent

- [ ] `artifacts.reports` accepts every documented report key, with its list or object value shape, at
      job and default level.
- [ ] `artifacts.access` and `artifacts.untracked` are typed where the schema and docs agree.
- [ ] The inventory exercises each report variant without raw; the report gap rows are removed.
- [ ] Tests cover list and object forms, unknown-key refusal through `raw` collision, and author order.
- [ ] `pnpm check` passes.
