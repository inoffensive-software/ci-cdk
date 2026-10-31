# 102: Pages at job level

**Spec:** `docs/specs/0010-gitlab-ci-pages.md`

**What to build:** Job-level `pages`, the four-path counterpart of ticket 101.

**Blocked by:** 101 (Pages at pipeline level).

**Status:** ready-for-agent

- [ ] `Job.pages` accepts the documented map with the same derivation discipline as ticket 101.
- [ ] Job raw collides with `pages`.
- [ ] The inventory exercises the job form without raw; `schema-gap-debt.json` drops `$.*.pages`.
- [ ] A golden pins the job body with `pages` in its fixed position.
- [ ] Tests cover the full shape, absent pages, and raw collision.
- [ ] `pnpm check` passes.
