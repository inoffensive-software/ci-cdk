# 106: Small deferred keys

**Spec:** `docs/specs/0009-gitlab-ci-grammar-completion.md`

**What to build:** The small deferred job keywords: `inherit`, `hooks`, `dependencies`, `start_in`,
`manual_confirmation` and `dast_configuration`.

**Blocked by:** 100 (Re-triage and target).

**Status:** ready-for-agent

- [x] Each key accepts its documented shape: `inherit` map, `hooks` map, `dependencies` string array,
      `start_in` string, `manual_confirmation` string, `dast_configuration` map.
- [x] `default` accepts `hooks` as well; job and default raw collide with every modelled key.
- [x] The inventory exercises each key without raw; the six gap rows are removed from the report.
- [x] Fixtures are pinned where possible, otherwise docs-derived with provenance.
- [x] Tests cover each shape, absent values, and ordering.
- [x] `pnpm check` passes.
