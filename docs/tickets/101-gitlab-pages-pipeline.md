# 101: Pages at pipeline level

**Spec:** `docs/specs/0010-gitlab-ci-pages.md`

**What to build:** Pipeline-level `pages`, deriving its keys from the pinned schema and GitLab's Pages
documentation. This is the larger half of the 378-path pages block.

**Blocked by:** 100 (Re-triage and target).

**Status:** ready-for-agent

- [ ] `Pipeline.pages` accepts the documented map, with keys and value types derived from the schema
      slice and the docs, emitted in a fixed order; absent keys are not emitted.
- [ ] Pipeline raw collides with `pages`.
- [ ] The inventory exercises every modelled page key without raw; `schema-gap-debt.json` drops
      `$.pages` and adds the still-missing children.
- [ ] A fixture pins the shape; if documentation-derived, provenance records the doc page and date.
- [ ] Tests cover the full shape, an absent pages block, raw collision, and emission order.
- [ ] `pnpm check` passes.
