# 14: Corpus, first entry

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** A real public workflow, vendored verbatim at a pinned commit, is reproduced by the
DSL byte for byte. This is the first measurable answer to "supports GitHub Actions", and it settles
the corpus comparison rule that the format contract forces.

**Blocked by:** 08 (Triggers), 09 (Job graph and execution fields), 10 (Job shape breadth),
11 (Raw escape hatch)

**Status:** ready-for-agent

- [ ] The config is vendored verbatim under the provider's corpus directory, with repo, commit SHA,
      path and MIT licence recorded in provenance.
- [ ] A corpus test renders the equivalent definition with the header suppressed and asserts string
      equality against the vendored bytes, so a CRLF or trailing-newline difference fails rather than
      being normalised.
- [ ] The corpus README states the comparison rule: the header is suppressed, and an entry is chosen
      to contain no comments and no blank lines because the format contract permits neither.
- [ ] A coverage-debt ledger exists and is asserted in both directions: every declared raw path is
      used by a fixture, and every raw path used by a fixture is declared.
- [ ] Any key the vocabulary cannot model is expressed through `raw` and appears in the ledger with
      a one-line reason.
- [ ] The corpus config's comment-free selection rationale is recorded, so a future maintainer does
      not add a config that cannot reproduce.
- [ ] `pnpm check` passes.
