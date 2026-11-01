# 60: Custom-pipeline variables

**Spec:** `docs/specs/0008-bitbucket-grammar-completion.md`

**What to build:** The leading `variables:` declaration on a custom pipeline, so a manual run prompts for typed inputs instead of relying on untyped repository variables.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `CustomVariable` carries `name`, `default`, `description` and `allowed-values`; `NamedPipeline` gains an optional `variables` list.
- [x] A custom pipeline with variables emits one leading `- variables:` item before its items; each variable emits `allowed-values`, `default`, `description`, `name` in that order.
- [x] A variable with an empty name, or an `allowed-values` list with no values, is refused with a diagnostic at the variable's path.
- [x] `dawiddiwad/salesforce-e2e-test-automation` at `df236454fd51129cbeb118c4339a8b6908e21740` was
      dropped rather than forcing a conformance exception: its `default` is a boolean, while the
      pinned schema types `default` as a string, so the entry cannot both reproduce and conform.
      `description` is therefore schema-derived, covered by a synthetic fixture.
- [x] `Nakama-Partnering-Services/nakama-project-scaffolding` at `fd8bfc6f5b7c9e3ada89c99c8d8aec27d586a6f0` (MIT, 7188 bytes, 171 lines, SHA-256 `ca31bd3371cc55bc4ef1ce51a251f65a754e7cdd346eeb916645997da3b40af5`) is vendored and compares as parsed data.
- [x] Inventory, exhaustiveness gate and documented-grammar lists are re-derived; the stale-row check is empty.
- [x] Goldens are added; no existing golden changes.
- [x] `pnpm check` passes.
