# 52: Bitbucket documented-grammar diff

**Spec:** `docs/specs/0007-bitbucket-pipelines-provider.md`

**What to build:** Apply the shared schema walker to the Bitbucket schema and diff it against the
modelled inventory, so "what can Bitbucket write that we cannot" is a declared, categorised list
rather than an absence of evidence. The first entry is expected to be an overclaim:
`definitions.steps` is documented and used everywhere, and the pinned schema does not describe it.

**Blocked by:** 49 (Modelled-path inventory and exhaustiveness gate)

**Status:** ready-for-agent

- [ ] The walker runs over the vendored Bitbucket schema from its root and contributes no provider
      nouns of its own; the diff and its two lists are provider-local.
- [ ] `GAPS` holds every schema path the inventory cannot emit, each with a `reason` and a
      `category` from `unmodelled | out-of-scope | schema-noise`.
- [ ] `OVERCLAIMS` holds every modelled path the schema does not describe, each with a `reason`;
      `$.definitions.steps` is declared, and any other overclaim the run exposes is declared with its
      reason rather than suppressed.
- [ ] Both lists are asserted in both directions: an undeclared path fails, and an unused row fails.
- [ ] The report is sorted and de-duplicated and is asserted as sets of paths, with a negative case
      for each direction.
- [ ] The declared `out-of-scope` rows match the spec's list (agents, imports, shared definitions,
      triggers, labels, export, child pipelines and step config, auth and input variables, runtimes,
      expanded artifacts, AWS image auth, custom-pipeline variables); anything unexpected is reported
      before it is categorised.
- [ ] No production code changes and no new ADR: ADR 0011 already records the policy.
- [ ] `pnpm check` passes.
