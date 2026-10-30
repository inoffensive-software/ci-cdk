# 15: Corpus, second entry

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** A second real config with a different shape round-trips, proving the corpus is a set
and not a single lucky fixture. This is the point where the provider is measurably
useful to someone other than its author.

**Blocked by:** 14 (Corpus, first entry)

**Status:** done

- [x] The second config is vendored verbatim with repo, commit SHA, path and MIT licence in
      provenance, and it uses a different combination of shapes from the first entry.
- [x] It reproduces with the header suppressed, compared as data per ADR 0005 (byte equality is
      kept for the entries that achieve it).
- [x] The coverage-debt ledger is updated and both of its assertions still hold.
- [x] Any gap the second entry exposes is either modelled or declared in the ledger with a reason,
      never worked around by editing the fixture.
- [x] `pnpm check` passes.
