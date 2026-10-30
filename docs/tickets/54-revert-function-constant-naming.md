# 54: Revert function bindings to camelCase

**Spec:** none (review of PR #22; reverses the function half of ticket 28)

**What to build:** Ticket 28 renamed every module-level binding in `src/` and `test/` to
`SCREAMING_SNAKE_CASE`, functions included. That was too broad: `SCREAMING_SNAKE_CASE` is for the
invariant data a module holds, and a function is not data. Every binding whose value is a function
goes back to `camelCase`, data bindings keep their name, and `docs/principles.md` shows one example
of each so the next contributor does not have to infer where the line sits.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Every module-level binding in `src/` and `test/` whose value is a function, including an arrow
      function bound with `const`, is `camelCase` again; importers are updated so nothing refers to
      an old name.
- [ ] Every data binding keeps `SCREAMING_SNAKE_CASE`: a literal, a template literal, a regular
      expression, an array, a record, a symbol, or an instance produced once by a call.
- [ ] The `Naming` section of `docs/principles.md` carries one example of each shape, so a function
      binding and a data constant are shown side by side rather than only described.
- [ ] `yamlSerializer` keeps its name: it is a published package export, and a convention change does
      not rename a consumer's import.
- [ ] `tools/**` is untouched: it is vendored and refreshed wholesale by its installer. Root config
      files (`vitest.config.ts`, `tsconfig*.json`) are out of scope.
- [ ] Behaviour is identical: same rendered output, same diagnostics, goldens untouched.
- [ ] `pnpm check` passes.
