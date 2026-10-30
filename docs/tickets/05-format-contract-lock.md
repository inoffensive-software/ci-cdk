# 05: Lock the format contract and neutrality guards

**Spec:** `docs/specs/0001-core-doc-and-yaml-emitter.md`

**What to build:** The emitted bytes and the provider-neutral boundary stop depending on anyone
remembering them. Rendering the same document in two fresh module graphs produces identical bytes, a
test fails if a provider name appears in core, and the two format choices the architecture left open
are written down where the contract lives, so the next provider inherits them instead of re-deciding.

**Blocked by:** 02 (Quoting contract), 03 (Shell blocks, explicit styles and tags).

**Status:** ready-for-agent

- [ ] Rendering the same fixture twice through two fresh module graphs yields byte-identical output,
      proving no module-level state affects emission.
- [ ] The determinism test additionally asserts LF-only output and exactly one trailing newline.
- [ ] A test walks core sources and fails if `github`, `gitlab`, `bitbucket` or `actions` appears,
      case-insensitively, so the guard exists before the first provider lands.
- [ ] The emitted-format section of the architecture document states that sequences are indented under
      their key and that empty collections emit as `{}` and `[]`, the two choices the current text
      leaves open.
- [ ] Goldens pin the remaining format edges: a deeply nested document, a document whose root is empty,
      and a document with the header disabled.
- [ ] The serializer rejects output containing a blank line or a `---` marker, so a pinned option that
      was bypassed fails loudly rather than producing a subtly wrong file.
- [ ] `pnpm check` passes.
