# 65: Provider page regeneration and unproven marking

**Spec:** `docs/specs/0008-bitbucket-grammar-completion.md`

**What to build:** Regenerate the provider page after the six slices, so coverage, gaps, overclaims and non-goals describe the completed vocabulary, and mark the two families that rest on documentation or schema evidence.

**Blocked by:** 59, 60, 61, 62, 63, 64

**Status:** ready-for-agent

- [ ] The coverage block regenerates from the inventory and corpus, and the document test asserts it byte for byte.
- [ ] The documented-grammar block regenerates: counts, unmodelled rows, grouped out-of-scope rows, schema-noise and overclaims all follow the re-derived lists.
- [ ] The open-gaps block states the ledger is empty.
- [ ] Non-goals no longer name expanded artifacts, custom-pipeline variables, event triggers, runtimes and registry auth, child pipelines or the agent runtime; it retains imports and shared definitions, step auth, labels, artifact capture-on/depth/ignore-paths, static image credentials, self-hosted storage auth and `definitions.runners`.
- [ ] Child pipelines and the agent runtime carry an explicit "unproven" note in Quirks or a dedicated evidence paragraph, naming documentation and schema respectively, so support and inference are distinguishable.
- [ ] The corpus table lists the new pinned entries with hosts, commits, licences and example-file markers where they apply.
- [ ] README status remains In Progress; the subpath and page link are unchanged.
- [ ] `docs/architecture.md` needs no change unless a module was added; if one was, it is listed.
- [ ] `pnpm check` passes, including the formatter over the regenerated page.
