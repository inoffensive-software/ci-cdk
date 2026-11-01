# 102: Pages at job level

**Spec:** `docs/specs/0010-gitlab-ci-pages.md`

**What to build:** Job-level `pages`, the four-path counterpart of ticket 101.

**Blocked by:** 101 (Pages at pipeline level).

**Status:** done

- [x] `Job.pages` accepts the documented map with the same derivation discipline as ticket 101: a
      boolean flag or `{ publish, path_prefix, expire_in }`, derived from the schema slice and the
      Pages docs, in that fixed order.
- [x] Job raw collides with `pages`.
- [x] The inventory exercises the job form without raw; `schema-gap-debt.json` drops `$.*.pages`.
- [x] A golden pins the job body with `pages` in its fixed position.
- [x] Tests cover the full shape, absent pages, and raw collision.
- [x] `pnpm check` passes.
