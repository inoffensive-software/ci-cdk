# 59: One corpus gate rule-set

**Spec:** none (refactor found by the sharing sweep)

**What to build:** The rules the corpus gate enforces — a corpus path is modelled or declared, a ledger
row is used, a fixture never writes `raw` for a modelled key — are stated once and take each provider's
two provider-specific pieces as parameters. Today every provider re-implements them.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] A shared module owns `unique`, `gapPaths`, `unusedLedgerPaths`, `filledRawPaths`, `remediesFor`
      and the inventory-path union, with no CI nouns in it.
- [ ] Each provider supplies only its `keyPaths` normalisation and its `rawPathsOf` walk; the three
      `exhaustiveness.ts` files shrink to those two pieces plus their `AUTHOR_NAMED` list.
- [ ] The GitLab root and hidden-template normalisation and the Bitbucket selector rewrites stay
      provider-local.
- [ ] Behaviour is identical: same assertions, same failures, same messages, same test counts.
- [ ] `pnpm check` passes.
