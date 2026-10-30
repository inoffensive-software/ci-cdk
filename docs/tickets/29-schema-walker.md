# 29: The schema walker

**Spec:** `docs/specs/0005-documented-grammar-coverage.md`

**What to build:** A test-support walker that reads a vendored JSON schema from its root and returns
every key path it allows, in the same notation the exhaustiveness gate uses. It resolves references,
unions branches, normalises arrays and keyed maps, refuses a shape it does not understand instead of
understating the grammar, and terminates on a reference cycle.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] The walker lives in shared test support under `test/schemas/`, contains no provider nouns, and
      adds no production code.
- [ ] The walk starts at the schema root; a definition nothing references contributes no paths.
- [ ] A `$ref` resolves against the schema's own definitions, and a reference cycle terminates with the
      paths already found rather than recursing.
- [ ] `oneOf` and `anyOf` contribute the union of their branches.
- [ ] An array contributes `items`; a tuple form (`prefixItems`, or `items` given as an array) throws
      with the offending path rather than being skipped.
- [ ] `patternProperties` contributes a wildcard child; a schema-valued `additionalProperties`
      contributes that schema's keys; `additionalProperties: true` marks the node open, so its children
      are wildcards.
- [ ] Paths use the inventory's notation, and the output is sorted and de-duplicated.
- [ ] Unit tests use a small synthetic schema and cover a reference, a reference cycle, a union, an
      array, a pattern-keyed map, an open map, and a tuple form that must throw.
- [ ] `pnpm check` passes.
