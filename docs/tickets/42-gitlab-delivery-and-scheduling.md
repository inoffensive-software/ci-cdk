# 42: Delivery and scheduling

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** The remaining scheduling and delivery keys: `environment`, `release`, `parallel`,
`retry`, `timeout`, `interruptible`, `allow_failure`, `when`, `resource_group` and `coverage`.

**Blocked by:** 41 (Rules and needs).

**Status:** ready-for-agent

- [ ] `environment` accepts a name or a map with `url`, `action`, `on_stop`, `auto_stop_in` and
      `deployment_tier`.
- [ ] `release` accepts `tag_name`, `description`, `name`, `ref`, `milestone` and `released_at`.
- [ ] `parallel` accepts a count or a `matrix` of flat scalar rows; matrix rows preserve author key
      order and ADR 0010's string-versus-number distinction.
- [ ] `retry` accepts a count or a map with `max`, `when` and `exit_codes`.
- [ ] `timeout`, `interruptible`, `allow_failure`, `when`, `resource_group` and `coverage` are typed
      and emitted at the spec's fixed positions; absent values emit nothing.
- [ ] The inventory exercises every new field without `raw`, and the last vocabulary-gap ledger rows in
      the corpus are deleted.
- [ ] `pnpm check` passes.
