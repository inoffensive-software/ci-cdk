# 49: Modelled-path inventory and exhaustiveness gate

**Spec:** `docs/specs/0007-bitbucket-pipelines-provider.md`

**What to build:** The measurement that turns "supports Bitbucket Pipelines" into a verdict: an
inventory whose rendered key paths are the modelled set, and a gate that holds the inventory, the five
corpus entries and the raw ledger to each other in both directions.

**Blocked by:** 47 (Composition items), 48 (Step vocabulary breadth)

**Status:** ready-for-agent

- [ ] A Bitbucket inventory renders one or more documents that between them use every modelled key
      and never use `raw`; a key the inventory cannot reach through a field is a vocabulary gap, not a
      reason to widen the inventory.
- [ ] The inventory normalises author-chosen map children to `*` (`definitions.caches`,
      `definitions.services`, `branches`, `tags`, `pull-requests`, `custom`, `variables`) and sequence
      positions to `[]`, reusing the shared path walker rather than forking it.
- [ ] The gate fails when a corpus key is neither modelled nor declared in the ledger, when a declared
      row is unused, and when a modelled key is reached through `raw`.
- [ ] A test asserts every author-named path in the normalisation list occurs in the inventory, so a
      typo cannot exclude nothing silently.
- [ ] The five fixtures' raw usage is held to the ledger, both directions, through the shared coverage
      helper; the ledger is empty and the test asserts it.
- [ ] The gate's failure messages name the offending path, so a failure is actionable without reading
      the implementation.
- [ ] `pnpm check` passes.
