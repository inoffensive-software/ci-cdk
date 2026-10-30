# 28: Constant naming across the codebase

**Spec:** none (convention change from review of PR #5)

**What to build:** Every module-level constant in `src/` and `test/` is named in
`SCREAMING_SNAKE_CASE`, so a reader can tell a shared value from a function at a glance. The rule is
written into `docs/principles.md` so the next contributor does not have to infer it, and so a reviewer
can point at it.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Every top-level binding in `src/` and `test/` whose value is data is renamed to
      `SCREAMING_SNAKE_CASE`: literals, template literals, regular expressions, arrays, records,
      symbols, and instances produced once by a call.
- [x] Bindings whose value is a function stay `camelCase`, including an arrow function bound with
      `const`; locals, parameters, destructured bindings, type aliases, interfaces and classes are
      untouched.
- [x] Importers of a renamed export are updated, including tests, so nothing refers to an old name.
- [x] `yamlSerializer` keeps its name: it is a published package export, and a convention change does
      not rename a consumer's import. The exception is stated in the guidance rather than left implicit.
- [x] `tools/**` is untouched: it is vendored and refreshed wholesale by its installer. Root config
      files (`vitest.config.ts`, `tsconfig*.json`) are out of scope.
- [x] `docs/principles.md` states the rule and its exception in the existing `Naming` section, in the
      file's voice, and updates that section's `Settles:` line to cover constants as well as functions.
- [x] Behaviour is identical: same rendered output, same diagnostics, goldens untouched.
- [x] `pnpm check` passes.
