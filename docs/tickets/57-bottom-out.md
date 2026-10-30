# 57: Bottom out the documented grammar

**Spec:** `docs/specs/0005-documented-grammar-coverage.md`

**What to build:** The two things keeping the compatibility table from being final. The `image_version`
trigger goes, because the schema rejects it and nothing uses it. The five shapes nobody could be found
using become declared non-goals rather than open debt. The last two rows, which are a limit of the walk
rather than of the vocabulary, stay unmodelled and keep their reasons. Unmodelled falls to two.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `image_version` is removed from the trigger vocabulary and its filter type, with the provider
      tests updated, and no path in either declared list changes as a result.
- [x] ADR 0012 records the removal: the vendored schema rejects the event, no corpus entry or public
      workflow was found using it, and it was invisible to the documented-grammar diff because the
      inventory may only hold schema-valid documents.
- [x] The snapshot and service `command`/`entrypoint` rows are recategorised `out-of-scope`, with a
      reason naming the date the search was run and the fact that no permissively licensed workflow was
      found using the key, and matching bullets in the provider document's non-goals.
- [x] The two nesting rows under `parallel[]` stay `unmodelled`, with a reason naming the walk's
      one-level limit, and the closed category union stays at three values.
- [x] Both generated blocks in the provider document are regenerated, and the counts show the two
      nesting rows as the remaining unmodelled debt.
- [x] Tickets 54, 56 and 57 are marked done with their boxes ticked, in this PR.
- [x] `pnpm check` passes.
