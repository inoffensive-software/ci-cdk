# 107: Include and trigger nesting

**Spec:** `docs/specs/0009-gitlab-ci-grammar-completion.md`

**What to build:** The unmodelled children of `include` and `trigger`: include rules, include inputs'
object form, trigger `forward`, and the remaining trigger input shapes.

**Blocked by:** 100 (Re-triage and target).

**Status:** ready-for-agent

- [ ] `include.rules`, `include.inputs` and trigger inputs accept their documented map forms, including
      the `{ value, expand, options, description }` input shape where the schema allows it.
- [ ] `trigger.forward` accepts the documented map; `trigger.include` accepts the remaining entry keys.
- [ ] `default` mirrors any include-like nesting it supports; raw collisions cover the new keys.
- [ ] The inventory exercises each shape without raw; the corresponding unmodelled rows are removed.
- [ ] Tests cover map/scalar input variants, absent values, and author order.
- [ ] `pnpm check` passes.
