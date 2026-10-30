# 35: Rules and needs

**Spec:** `docs/specs/0005-gitlab-ci-breadth.md`

**What to build:** Typed job conditions and the DAG: `rules` with `if`, `changes`, `exists`, `when`,
`allow_failure`, `variables` and `needs`, and `needs` with `job`, `optional`, `artifacts` and
`parallel`.

**Blocked by:** 34 (Job fundamentals).

**Status:** ready-for-agent

- [ ] `rules` accepts an ordered array of rules with `if`, `changes` (`paths`, `compare_to`), `exists`,
      `when`, `allow_failure`, `variables` and `needs`; absent subkeys are not emitted.
- [ ] `when` is the closed union `on_success | on_failure | always | never | manual | delayed`, shared
      where GitLab accepts the same values.
- [ ] `needs` accepts job names and need maps with `job`, `optional`, `artifacts` and a
      `parallel.matrix` of flat scalar rows.
- [ ] Neither `rules` nor `needs` is resolved against includes; a target that may live in an include is
      not a diagnostic.
- [ ] `workflow.rules` uses the same `Rule` type, so a rule has one shape at job and pipeline level.
- [ ] Rule order, need order and matrix row order are author order, pinned by a golden.
- [ ] The inventory exercises every new field without `raw`, and the corpus ledger rows for `rules`,
      `needs`, `workflow.rules` and rule-level `variables` are deleted.
- [ ] `pnpm check` passes.
