# 03: Shell blocks, explicit styles and tags

**Spec:** `docs/specs/0001-core-doc-and-yaml-emitter.md`

**What to build:** A multi-line shell script emits as a literal block scalar, keeping its internal and
trailing newlines without escaping, and a provider can ask for single-quoted, double-quoted or folded
text and a tag such as GitLab's `!reference`. Style travels with the value: content never decides it.

**Blocked by:** 01 (Emit plain data).

**Status:** ready-for-agent

- [ ] `block(text)` emits a literal block scalar that preserves internal newlines and trailing
      newlines, and parses back to the original text.
- [ ] `scalar(text, { style })` honours `plain`, `single`, `double`, `literal` and `folded` where each
      style can express the given text.
- [ ] A tagged scalar emits its tag and still parses back to the same value.
- [ ] `fromValue` never produces a literal block or a non-plain style for plain data, including data
      that contains newlines, so a multi-line string from ordinary data is not silently turned into a
      shell block.
- [ ] A literal block whose text lacks a trailing newline and one whose text has several trailing
      newlines both emit valid output, each pinned by a golden.
- [ ] A single golden exists for each of: literal script, folded text, tagged scalar.
- [ ] `pnpm check` passes.
