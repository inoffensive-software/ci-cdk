# 07: Expressions and typed scalars

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** A workflow can carry GitHub expressions and real numbers and booleans without the
author thinking about quoting. An expression containing `: ` or ` #` reaches the file intact, a
multi-line shell snippet stays a block, and `timeout-minutes` emits as `10` rather than `"10"`.

**Blocked by:** 06 (Render a workflow)

**Status:** ready-for-agent

- [ ] `Text` is accepted wherever a value may be an expression, and a leaf passes where a string is
      accepted with no cast at the call site.
- [ ] `expr` interpolates a template literal into a double-quoted `${{ ... }}` scalar, and an
      expression containing `: `, ` #` or `{{ }}` emits as valid YAML.
- [ ] `script` returns a literal-block leaf, and a shared snippet passed as `run` keeps its newlines
      wherever it is used.
- [ ] `matrix(key)` and `needs(id, output)` emit the same node shape as `expr` for
      `${{ matrix.<key> }}` and `${{ needs.<id>.outputs.<output> }}`.
- [ ] `timeout-minutes` is typed as a number and emits unquoted; `continue-on-error` is typed as a
      boolean or `Text` and emits `true`/`false` unquoted.
- [ ] Steps carry `id`, `name`, `if`, `uses`, `run`, `with`, `env`, `working-directory`, `shell`,
      `continue-on-error` and `timeout-minutes`, with provider key names preserved.
- [ ] `if` accepts a plain string or a leaf, so a valid plain condition is not double-quoted.
- [ ] `with` and `env` preserve author order.
- [ ] A golden covers an expression containing a colon and a multi-line script in one step.
- [ ] No cast is used to make the leaf types line up; `unknown` does not appear anywhere in the
      provider.
- [ ] `pnpm check` passes.
