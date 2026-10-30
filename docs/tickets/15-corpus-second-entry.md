# 15: Corpus, second entry

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** A second real config with a different shape round-trips byte for byte, proving the
corpus is a set and not a single lucky fixture. This is the point where the provider is measurably
useful to someone other than its author.

**Blocked by:** 14 (Corpus, first entry)

**Status:** ready-for-agent

- [ ] The second config is vendored verbatim with repo, commit SHA, path and MIT licence in
      provenance, and it uses a different combination of shapes from the first entry.
- [ ] It reproduces byte for byte with the header suppressed.
- [ ] The coverage-debt ledger is updated and both of its assertions still hold.
- [ ] Any gap the second entry exposes is either modelled or declared in the ledger with a reason,
      never worked around by editing the fixture.
- [ ] `pnpm check` passes.
