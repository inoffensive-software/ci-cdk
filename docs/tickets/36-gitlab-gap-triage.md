# 36: Triage the GitLab gap report

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** Classify every row the first GitLab diff reports, so the numbers in the provider page
mean something. This ticket classifies; it does not build vocabulary.

**Blocked by:** 35 (GitLab documented-grammar diff).

**Status:** ready-for-agent

- [ ] Every gap row carries one of `unmodelled`, `out-of-scope` or `schema-noise`, and a reason a reader
      can act on.
- [ ] A row already named in spec 0006's or the provider page's non-goals is `out-of-scope`, and the
      reason points at that non-goal rather than restating it.
- [ ] A row the schema allows but GitLab does not document is `schema-noise`, and its reason says what
      the schema gets wrong.
- [ ] Every remaining row is `unmodelled`, with a reason naming the shape in words rather than repeating
      the path.
- [ ] Every overclaim is confirmed against GitLab's documentation, and its reason says whether the
      schema is stale or the provider is wrong.
- [ ] No vocabulary is added, except where an existing pinned corpus entry already needs the key; such a
      row stays `unmodelled` and is named in the pull request as the next corpus-driven ticket.
- [ ] The pull request states counts per category and names the three or four `unmodelled` rows most
      likely to be hit in the wild.
- [ ] `pnpm check` passes.
