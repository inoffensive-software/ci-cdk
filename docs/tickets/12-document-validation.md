# 12: Document validation

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** A definition that cannot be a valid workflow fails to render, in one call, with
every problem named and a path that points at it. Duplicate ids, dangling `needs`, cycles, and the
two mutually exclusive body combinations are caught before a file is written.

**Blocked by:** 09 (Job graph and execution fields), 10 (Job shape breadth)

**Status:** ready-for-agent

- [ ] A duplicate job id is a diagnostic naming both positions, and the emitted map never silently
      drops one.
- [ ] A `needs` entry naming a job that does not exist is a diagnostic naming the referencing job and
      the missing id.
- [ ] A `needs` cycle is a diagnostic that lists the members in order.
- [ ] A job with both `steps` and `uses` is a diagnostic, and a step with both `run` and `uses` is a
      diagnostic.
- [ ] One render over a document with several different problems throws a single `DiagnosticError`
      carrying all of them.
- [ ] Diagnostic paths use the core notation: `$.jobs[2].id`, `$.jobs[0].needs[1]`,
      `$.jobs[1].steps[3]`, with bracket-quoted form for keys that are not identifiers.
- [ ] Validation runs only in the lowering function; no builder throws, and a valid document renders
      exactly as before.
- [ ] Tests assert the diagnostic set as path and message pairs, not a formatted string.
- [ ] `pnpm check` passes.
