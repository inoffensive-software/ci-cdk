# Spec 0005: Documented-grammar coverage

Status: ready-for-agent
Covers: the gap between "round-trips the pinned corpus" and "covers what GitHub documents".
Respects: ADR 0001, 0002 (D3, D6), 0005, 0007, 0010. Adds ADR 0011.

## Problem Statement

The provider's coverage claim is extensional. Six pinned configs reproduce as data, the ledger is
empty, and the exhaustiveness gate proves that every key those six files use is modelled. That is a
true and measurable statement, and it is also the entire statement. Nothing compares the vocabulary
with the grammar GitHub documents, so nobody can say how much of that grammar is missing, which of the
missing parts matter, or whether a gap is rare in practice or merely unrecorded.

The vendored schema is already in the repository and is already used, but only as a validator: the
suite asks "is this document valid", never "what does this document allow that we cannot write". So a
schema refresh changes which outputs are rejected and changes nothing about what the vocabulary is
known to omit. The two files that would answer the question, the schema and the inventory, are never
compared.

This matters because of what the missing measurement does to every other claim. A consumer cannot tell
whether a shape they need is unsupported by decision or by oversight. A maintainer cannot order work by
how much documented grammar a ticket would close. And "supports GitHub Actions" cannot be said honestly
at all: the strongest true sentence today is "reproduces these six files", which is a sample, not a
grammar.

## Solution

Measure the documented grammar and hold the gap in a declared list:

- A walker that reads the vendored schema from its root and produces the set of key paths it allows,
  in the same notation the exhaustiveness gate already uses for the inventory and the corpus.
- A diff: schema paths that the inventory cannot emit are the gap. Each one is either modelled, or
  declared in an exception list with a reason and a category, exactly as the coverage ledger works.
- A failure policy that makes a schema refresh visible: a path that is neither modelled nor declared
  fails the suite, so a refresh always surfaces as a review, never as a silent widening of the gap.
- A generated section in `docs/providers/github-actions.md` that states the numbers and lists the
  declared exceptions, so the claim and its debt are one artefact.
- Triage that classifies every exception as vocabulary to build, outside this provider's scope, or
  noise in the schema, without building any of it in this spec.

After this, "supported" has a size. The gap is a list of named paths with reasons, not an absence of
evidence, and the next provider inherits the walker rather than inventing one.

## User Stories

1. As a maintainer, I want the vendored schema read as a grammar, so that the coverage claim stops
   being a statement about six files.

2. As a maintainer, I want the set of key paths the schema allows, so that "what can GitHub write that
   we cannot" is a number and a list.

3. As a maintainer, I want that list produced without a hand-written inventory of GitHub's grammar, so
   that it cannot rot as the schema changes.

4. As a maintainer, I want the comparison to use the same path notation as the exhaustiveness gate, so
   that a gap found here and a gap found by the corpus read the same.

5. As a maintainer, I want a schema path that is neither modelled nor declared to fail the suite, so
   that refreshing the schema is a deliberate change with a review.

6. As a maintainer, I want a declared exception with no matching schema path to fail, so that the list
   cannot accumulate rows nobody needs.

7. As a maintainer, I want every exception to carry a reason and a category, so that the list is a
   roadmap rather than a bin.

8. As a maintainer, I want the categories to distinguish "not modelled yet" from "outside this
   provider's scope" from "the schema is wrong or stale", so that only the first is debt.

9. As a maintainer, I want the numbers in the provider document, so that a reader sees coverage and
   debt together.

10. As a maintainer, I want the document's section generated and asserted, so that editing it by hand
    fails.

11. As a maintainer, I want the walker to resolve schema references, so that a path is discovered
    wherever the schema chooses to declare it.

12. As a maintainer, I want the walker to survive a reference cycle, so that a schema that points at
    itself reports paths instead of hanging.

13. As a maintainer, I want union branches unioned rather than picked, so that no allowed key is missed
    because it lives in the second `oneOf` arm.

14. As a maintainer, I want arrays normalised to a single position, so that a key inside `items` is one
    path regardless of how many elements a document has.

15. As a maintainer, I want pattern-keyed and open-ended maps normalised to a wildcard child, so that
    an author-chosen name is not reported as a missing key.

16. As a maintainer, I want the walk to start at the schema's root, so that unused definitions do not
    appear as grammar.

17. As a maintainer, I want the output sorted and de-duplicated, so that two runs produce the same
    report.

18. As a maintainer, I want the walker to live in shared test support, so that the next provider's
    schema uses it rather than a copy.

19. As a provider author, I want no production code in this work, so that measuring the gap does not
    change what the package emits.

20. As a provider author, I want triage to declare rather than build, so that vocabulary is still
    driven by pinned configs and not by the schema's size.

21. As a provider author, I want a row that existing corpus entries already need modelled in a
    follow-up ticket, so that the corpus stays the priority signal.

22. As a consumer, I want the unsupported shapes written down with reasons, so that I can tell whether
    my configuration is inside the claim before I write it.

23. As a consumer, I want the `image_version` inconsistency recorded as a row rather than as prose, so
    that it is visible in the same place as every other gap.

24. As the next agent, I want each ticket in this spec to be checkable on its own, so that a single
    fresh context can finish one.

## Implementation Decisions

1. **The comparison is between two key-path sets, in both directions.** Left is every path the schema
   allows from its root; right is the modelled set the exhaustiveness gate already derives from the
   inventory. A path only on the left is a **gap**: grammar GitHub documents that this provider cannot
   emit. A path only on the right is an **overclaim**: vocabulary that emits a key the schema rejects.
   No second definition of "modelled" is introduced.

2. **Paths use the inventory's notation.** A map key is kept; a sequence position normalises to `[]`;
   a child of an author-named or open map normalises to `*`. The generator and the gate must agree
   character for character, so a gap reported here can be pasted into the gate unchanged.

3. **The walker starts at the schema root and never enumerates definitions directly.** A definition
   that nothing references is not grammar. This is what keeps noise out without a blocklist.

4. **References resolve against the schema's own definitions, with a visited set.** A `$ref` cycle
   reports the paths it has already found and stops, rather than recursing.

5. **Unions are unions.** `oneOf` and `anyOf` contribute every branch's paths. A key that is legal in
   one arm is legal, whichever arm the emitter would choose.

6. **Arrays contribute `items` only.** A tuple form (`prefixItems`, or `items` as an array) is not
   supported by the walker. If the vendored schema ever uses one, the walker fails loudly with the
   path; silently skipping a shape would understate the grammar, which is the failure this spec exists
   to prevent.

7. **Map-shaped keywords are understood, not guessed.** `patternProperties` contributes its child
   pattern as a wildcard key; an `additionalProperties` that is a schema contributes that schema's
   keys; `additionalProperties: true` marks the node as an open map whose children are wildcards. This
   is the same distinction the gate already makes for `env`, `with`, `matrix` axes and job ids.

8. **Two declared lists, each mirroring the coverage ledger.** `GAPS` holds a schema path this provider
   cannot emit, with a `reason` and a `category`. `OVERCLAIMS` holds a modelled path the schema does
   not allow, with a `reason`. Both are asserted in both directions: a path that is neither modelled nor
   declared fails, and a declared row with no matching path fails. Adding a row is a deliberate
   widening; deleting one is how a gap closes.

9. **The gap categories are closed.** `unmodelled` (vocabulary this provider should gain),
   `out-of-scope` (a shape this provider deliberately does not model, already named in the provider
   document's non-goals), and `schema-noise` (the schema allows something GitHub does not document, or
   documents as deprecated). Only `unmodelled` counts as debt. An overclaim needs no category: every one
   is either a stale schema or a bug.

10. **The walker is shared test support; the diff and the list are provider-local.** The walker has no
    CI nouns and works on any vendored schema, so it lives under `test/schemas/`. The exception list is
    a fact about one provider, so it lives beside that provider's corpus.

11. **No vocabulary change in this spec.** Triage classifies; it does not implement. A row may be
    modelled during triage only if a pinned corpus entry already needs it, and then the row is closed in
    a follow-up ticket that cites the entry. Everything else is declared and left for a corpus-driven
    ticket.

12. **The provider document gains a generated section.** The counts (documented paths, gaps by category,
    overclaims), the gap table and the overclaim table, and a sentence naming the schema's pinned origin.
    It sits between markers and is compared with the generator's output, exactly like the corpus coverage
    table.

13. **ADR 0011 records the gate, the category vocabulary and the refresh rule**: the vendored schema is
    refreshed manually; a refresh is a deliberate change; a new path after a refresh fails until it is
    modelled or declared; the pinned copy's origin and date are already recorded in
    `docs/references/upstream-schemas.md` and are not restated.

14. **`image_version` becomes an overclaim row.** The provider types it, the vendored schema does not
    allow it, and no corpus entry uses it. Recording it in the overclaim list replaces the prose note in
    the provider document's non-goals, which is the only place the inconsistency is visible today.

15. **Determinism is part of the contract.** Both the walker and the diff return sorted, de-duplicated
    paths, and tests assert the sets rather than a formatted string.

## Testing Decisions

A good test here asserts a set of paths or a thrown failure, not the shape of the walker's internals.
The walker's tests use a small synthetic schema written for the purpose; the real schema is data, and a
test that pins its contents would fail on every refresh for no insight.

Seams:

- The walker, tested against synthetic schemas that contain a reference, a reference cycle, a union, an
  array, a pattern-keyed map, an open map, and a tuple form that must fail. These are the six shapes
  that decide whether the walk is complete, and each is cheaper to reason about in isolation than in a
  20 kB schema.
- The diff, tested through the same kind of negative cases the exhaustiveness gate uses: an invented
  schema path with no row fails; a row with no schema path fails; a modelled path is not reported.
- The provider document, tested by comparing its marked section with the generator's output byte for
  byte, and by asserting that every declared exception appears in it.

Prior art:

- `test/corpus/github-actions/exhaustiveness.test.ts` for the both-way set assertion and the negative
  cases that prove a gate can fail.
- `test/corpus/github-actions/document.test.ts` for the marked-block equality idiom.
- `test/schemas/validate.ts` for how a vendored schema is loaded and used in tests.

Specific decisions:

- The synthetic schema fixture is one file, small enough to read in a diff, and each shape it covers
  has its own named test.
- A tuple-form schema is asserted to throw, because the walker refusing to understate is the point.
- Counts are computed, never asserted as literals; a test that pins "37 paths" would have to be edited
  on every refresh and would teach nothing.
- The report is asserted as a set of paths, so wording changes in a reason do not fail a path test.

## Out of Scope

- Refreshing the vendored schema. Its staleness is now visible as declared rows, and refreshing it is a
  separate, deliberate change.
- Modelling any declared exception. Each becomes a corpus-driven ticket or stays a non-goal.
- A release or versioning policy. Schema-diff coverage is a prerequisite for claiming support, not the
  claim.
- GitLab's own schema-diff. The walker is reusable; wiring the second provider is a later ticket.
- Expression parsing, and anything about the value of a key. This measures grammar, not semantics.
- Changing the exhaustiveness gate, the coverage ledger or the corpus.

## Further Notes

The schema is loose, community-maintained and, in places, wrong: it permits keys GitHub no longer
documents and omits at least one the provider types. The `schema-noise` category exists because of
that, and a large noise count is a fact about the schema, not a failure of this spec.

The first triage will produce a long list. That list is the point: it converts "we do not know what we
do not support" into rows with reasons, and it gives every later vocabulary ticket a place to land.

This spec deliberately does not build. The temptation is to treat the schema as a backlog and
implement it; that would put the schema, which nobody runs, ahead of the corpus, which is the only
evidence of what users write. The rule stays: a pinned config creates the obligation, the schema only
names the possibility.
