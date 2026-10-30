# 54: Trigger option types, and the concurrency queue

**Spec:** `docs/specs/0005-documented-grammar-coverage.md` (a corpus-driven closure of two of its rows)

**What to build:** Every event GitHub documents as accepting `types` can express them, and a concurrency
group can say what happens to a queued run. Both are proved by one real config, `jdx/mise`'s release
pipeline, which sets `on.release.types` and `concurrency.queue: max` in the same file.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] The trigger vocabulary accepts `types` on every event GitHub documents it for, and claims no
      option an event does not take; an event with no options still lowers to `null` (ADR 0006).
- [x] `ConcurrencyGroup` gains `queue` as `single` or `max`, emitted after `cancel-in-progress`, at
      workflow and job level.
- [x] The `jdx/mise` workflow is vendored verbatim at the pinned commit, with repo, commit, path, MIT
      licence and a why-this-entry recorded in provenance, and reproduces as parsed data.
- [x] The entry is registered in the provider's entry list, and the inventory exercises
      `release.types`, a workflow-level queue and a job-level queue, so the modelled set covers them.
- [x] The documented-grammar rows for `$.concurrency.queue` and `$.jobs.*.concurrency.queue` are
      deleted, and both generated blocks in the provider document are regenerated to match.
- [x] A provider test shows a types-bearing event emitting its `types` sequence, and a concurrency
      group emitting its queue policy.
- [x] `pnpm check` passes.
