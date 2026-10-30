# 44: Provider page and coverage lock

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** The end state of the breadth slice: a provider page generated from the corpus and
gate, the final goldens, and a locked empty ledger. This ticket closes the initiative, so it runs only
after every vocabulary ticket.

**Blocked by:** 42 (Delivery and scheduling), 43 (The `!reference` leaf), 59 (Model the job trigger).

**Status:** done

- [x] `docs/providers/gitlab-ci.md` exists and follows `docs/providers/README.md`: scope, coverage,
      corpus, quirks, non-goals, open gaps. The corpus coverage table and the documented-grammar
      section are generated from the tests, not written by hand, and a test compares each marked block
      with its generator's output.
- [x] The documented-grammar section states the count of documented paths, the gaps grouped by
      category, and the overclaims, each row with its reason, beside the corpus coverage.
- [x] The coverage document names the three pinned entries, their commits and their licences, and links
      to the corpus tests rather than restating them.
- [x] The GitLab coverage ledger is empty: every raw path has been modelled, including the labkit
      `trigger`, and the coverage test asserts set equality with an empty declared set.
- [x] The exhaustiveness gate is green for all three entries, with no modelled key written through
      `raw` and no unused ledger row.
- [x] The documented-grammar diff is green: every gap is modelled or declared with a category and a
      reason, every overclaim is declared, and neither list has an unused row.
- [x] Schema conformance is green for inventory and all entries with hidden templates stripped.
- [x] Final goldens pin the whole modelled vocabulary; regenerating from unchanged source produces no
      diff, and no existing golden changes.
- [x] The README provider table and the architecture provider surface remain accurate; no duplicated
      format rule or decision is added.
- [x] `pnpm check` passes.
