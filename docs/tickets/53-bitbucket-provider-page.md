# 53: Bitbucket provider page and living documents

**Spec:** `docs/specs/0007-bitbucket-pipelines-provider.md`

**What to build:** Point the living documents at the provider that now exists: a provider page that
states scope, coverage, corpus, quirks, non-goals and open gaps, generated from the evidence rather
than written by hand; and the README and architecture stopped describing a two-provider package.

**Blocked by:** 49 (Modelled-path inventory and exhaustiveness gate), 50 (Bitbucket schema
conformance), 52 (Bitbucket documented-grammar diff)

**Status:** ready-for-agent

- [ ] `docs/providers/bitbucket-pipelines.md` follows the provider template: scope and subpath,
      generated coverage table, corpus table with commits and licences, quirks, non-goals, open gaps,
      and the documented-grammar section.
- [ ] The coverage table is generated from the inventory's modelled paths and the entries' corpus
      paths, and a test compares the marked block with that function's output, so editing it by hand
      fails.
- [ ] The quirks section states `step:` versus `steps:`, pipes as script items, quoted `*`/`**`
      selectors, `clone.depth: full`, and the `definitions.steps` overclaim.
- [ ] The open-gaps block is generated from the ledger and the declared grammar gaps, and a test
      asserts it; a non-empty ledger would show as rows rather than prose.
- [ ] The README provider table shows `@inoffensive/ci-cdk/bitbucket-pipelines` as `In Progress`, with
      the subpath matching the package export exactly.
- [ ] The architecture's provider surface names the module and its files, links ADR 0013 rather than
      repeating its reasoning, and does not copy format rules or invariants.
- [ ] The provider page does not restate invariants or the emitted format contract.
- [ ] `pnpm check` passes, including the formatter over the edited files.
