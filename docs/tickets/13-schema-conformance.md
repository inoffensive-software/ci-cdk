# 13: Schema conformance

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** Every emitted fixture is validated against a pinned copy of the upstream GitHub
workflow schema, so a key the schema rejects fails the library's own tests. The check is proven
non-vacuous by a fixture that must fail.

**Blocked by:** 06 (Render a workflow)

**Status:** ready-for-agent

- [ ] The upstream schema is vendored as a pinned copy, self-contained with no remote references, and
      the reference document records the source URL and the date of the copy.
- [ ] A JSON-schema validator is added as a dev dependency at an exact version, configured for
      draft-07 without strict mode.
- [ ] Every emitted test fixture parses back through the YAML library and validates against the
      vendored schema.
- [ ] A negative case proves the check can fail: a document carrying an unmodelled key through `raw`
      is rejected by the validator, and the test asserts that rejection.
- [ ] The check runs inside the normal test suite, with no separate command.
- [ ] `pnpm check` passes.
