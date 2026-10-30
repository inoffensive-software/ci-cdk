# 32: Corpus, gitlab-pages

**Spec:** `docs/specs/0005-gitlab-ci-breadth.md`

**What to build:** A third GitLab corpus entry, small and include-heavy: a component include with rules,
`default` image/tags, a hidden template with `variables` and `cache`, and one job with `needs`,
`extends`, `script` and `cache`.

Fetch `gitlab-org/gitlab-pages` at commit `80b941cceb10cb8c18e6cb09314a20ff08847f3e`, path
`.gitlab-ci.yml` (50 lines, MIT, Copyright GitLab Inc.). Verify SHA-256
`99145262691ca02eb9faf0e6181d5dbde33bea4025c5ff1f5709386d81f2cd17`. Do not edit the file.

**Blocked by:** 31 (Corpus, labkit), because both append to one ledger.

**Status:** ready-for-agent

- [ ] The file is vendored verbatim with repo, commit, path, MIT licence, SHA-256 and comparison mode
      `data` in provenance.
- [ ] A per-entry fixture reproduces the file's parsed data through `render(fixture, { header: "" })`;
      hidden entries use `templates`; the include component and its rules are preserved as data.
- [ ] Every unmodelled keyword is `raw` plus a ledger row with a reason; the ledger remains a single
      vocabulary-gap list for all three entries.
- [ ] The coverage test and exhaustiveness gate accept the entry; no modelled key is written through
      `raw`.
- [ ] No byte-equality assertion is added.
- [ ] `pnpm check` passes.
