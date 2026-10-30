# 12: Document validation

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** A definition that cannot be a valid workflow fails to render, in one call, with
every problem named and a path that points at it. Duplicate ids, dangling `needs`, cycles, and the
two mutually exclusive body combinations are caught before a file is written.

**Blocked by:** 09 (Job graph and execution fields), 10 (Job shape breadth)

**Status:** done

- [x] A duplicate job id is a diagnostic naming both positions, and the emitted map never silently
      drops one.
- [x] A `needs` entry naming a job that does not exist is a diagnostic naming the referencing job and
      the missing id.
- [x] A `needs` cycle is a diagnostic that lists the members in order.
- [x] A job with both `steps` and `uses` is a diagnostic, and a step with both `run` and `uses` is a
      diagnostic.
- [x] One render over a document with several different problems throws a single `DiagnosticError`
      carrying all of them.
- [x] Diagnostic paths use the core notation: `$.jobs[2].id`, `$.jobs[0].needs[1]`,
      `$.jobs[1].steps[3]`, with bracket-quoted form for keys that are not identifiers.
- [x] Validation runs only in the lowering function; no builder throws, and a valid document renders
      exactly as before.
- [x] Tests assert the diagnostic set as path and message pairs, not a formatted string.
- [x] `pnpm check` passes.
