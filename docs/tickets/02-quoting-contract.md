# 02: Quoting contract

**Spec:** `docs/specs/0001-core-doc-and-yaml-emitter.md`

**What to build:** Data that would otherwise change meaning survives a round trip through the emitter.
A consumer writing `"on"`, `"yes"`, `"1.10"` or a string containing `: ` gets output that a YAML
reader interprets as the string they wrote, while the key `on` and the number `1.1` stay unquoted and
readable. Long strings stay on one line, so a command's emitted bytes do not depend on where column 80
falls.

**Blocked by:** 01 (Emit plain data).

**Status:** ready-for-agent

- [ ] The key `on` is emitted unquoted.
- [ ] The strings `"yes"`, `"no"`, `"null"` and `"1.10"` are emitted quoted, and the numbers `1.1` and
      `10` are not.
- [ ] A string containing `: `, and a string containing ` #`, are emitted quoted and parse back to the
      original text.
- [ ] A plain string longer than 100 characters is emitted on one line.
- [ ] A string that is already wrapped in single or double quotes in the source data is not
      double-quoted by the emitter.
- [ ] Each trap above has its own golden, named for the trap, and the goldens are the assertion, not a
      substring check.
- [ ] Quoting behaviour comes from the pinned serializer options plus explicit `Doc` styles only. No
      provider name and no per-key special case appears in core.
- [ ] `pnpm check` passes.
