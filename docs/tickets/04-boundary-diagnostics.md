# 04: Boundary diagnostics

**Spec:** `docs/specs/0001-core-doc-and-yaml-emitter.md`

**What to build:** When data cannot cross the boundary, the consumer gets one `DiagnosticError` that
names every problem with a path they can act on, instead of a stack trace or a silently dropped key.
The parser checks the whole value in one pass, so a second run is never needed to find the next error.

**Blocked by:** 01 (Emit plain data).

**Status:** ready-for-agent

- [ ] `undefined` anywhere in the data is rejected with a diagnostic at the key's path, and is never
      silently omitted.
- [ ] Functions, symbols, bigint, `NaN`, `Infinity`, `-Infinity`, `Date`, `Map`, `Set` and class
      instances are each rejected with a diagnostic at their path.
- [ ] An ancestor cycle is rejected with a diagnostic naming the repeated path; the same object
      appearing twice in sibling positions is emitted twice and is not reported.
- [ ] One `fromValue` call over data containing several problems throws a single `DiagnosticError`
      carrying all of them.
- [ ] Diagnostic paths use the notation `$` for the root, `.name` for identifier keys, `["runs-on"]` for
      keys that are not identifiers, and `[0]` for indices, and a test asserts each form.
- [ ] `formatDiagnostics` renders one diagnostic per line as `path: message`, plus the hint when
      present, and `DiagnosticError.message` uses it.
- [ ] A header supplied to `renderDoc` that contains a newline is rejected with a diagnostic, since the
      contract permits exactly one comment line.
- [ ] `unknown` appears only as the parameter type of `fromValue`, and no cast is used to narrow it.
- [ ] `pnpm check` passes.
