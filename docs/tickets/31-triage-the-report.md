# 31: Triage the first report

**Spec:** `docs/specs/0005-documented-grammar-coverage.md`

**What to build:** Every gap the first run reports is classified and given a reason, and every overclaim
is confirmed, so the numbers in the provider document mean something. This ticket classifies; it does
not build vocabulary.

**Blocked by:** 30 (The schema diff, both declared lists, and ADR 0011)

**Status:** done

- [x] Every gap row carries one of `unmodelled`, `out-of-scope` or `schema-noise`, and a reason that a
      reader can act on.
- [x] A row already named in the provider document's non-goals is `out-of-scope`, and the reason points
      at that non-goal rather than restating it.
- [x] A row the schema allows but GitHub does not document is `schema-noise`, and its reason says what
      the schema gets wrong.
- [x] Every remaining row is `unmodelled`, with a reason naming the shape in words rather than repeating
      the path.
- [x] Every overclaim row is confirmed against GitHub's documentation, and its reason says whether the
      schema is stale or the provider is wrong.
- [x] No vocabulary is added, except where an existing pinned corpus entry already needs the key; such a
      row is left `unmodelled` and named in the pull request as the next corpus-driven ticket.
- [x] The pull request states the counts per category, and names the three or four `unmodelled` rows most
      likely to be hit in the wild, so the roadmap is visible without opening the file.
- [x] `pnpm check` passes.
