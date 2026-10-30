# Spec 0008: GitLab CI grammar completion

Status: ready-for-agent
Covers: the keywords spec 0006 deferred, after that slice closes.
Respects: ADR 0001, ADR 0002, ADR 0005, ADR 0008, ADR 0010, ADR 0011, ADR 0014, specs 0005-0007.
Adds: no decision record unless a deferred key changes a settled shape.

## Problem Statement

Spec 0006 closes with a gap report that mixes two different things under one label. Some `out-of-scope`
rows are architectural: `spec` headers, `$[[ ... ]]` interpolation, resolving `include`/`extends`/
`!reference`, and multi-file composition. No typed constructor should model those. Other `out-of-scope`
rows are ordinary GitLab keywords — `dependencies`, `inherit`, `start_in`, `manual_confirmation`,
`hooks`, `secrets`, `id_tokens`, `identity`, `run`, `pages`, `dast_configuration` — that were deferred
to keep the first slice finite.

Because both carry the same label, the report understates the work left. At the end of spec 0006 the
schema has 1,061 paths: roughly 165 modelled, 266 still unmodelled, 103 schema noise, and 527 covered
by rows labelled out-of-scope. A reader cannot tell which of those 527 are decisions and which are
simply the next layer of work. The "supports GitLab CI" claim is measured, but the plan to improve it is
not.

There is also no mechanism for a deferred key to come back. Spec 0006's rule — a pinned corpus entry
creates the obligation — is right, but nothing turns that rule into work once the first three entries
are exhausted.

## Solution

Separate permanent non-goals from deferred grammar, and drive the deferred half by corpus evidence.

- Redefine `out-of-scope` in the gap report to mean architectural non-goals only.
- Give every deferred keyword a promotion path: a new pinned corpus entry that uses it, then a ticket
  that models it, deletes its ledger row and moves its gap rows into the modelled set.
- Re-triage the existing rows once, so the report's categories match the new meaning.
- Set the completion target: the gap report's out-of-scope set equals the architectural non-goals, and
  every remaining gap is either modelled, `unmodelled` debt with a reason, or `schema-noise`.
- Slice tickets only after that re-triage, because the counts decide the order.

No keyword is modelled by reading the schema. The corpus remains the obligation signal, as in specs
0005 and 0006.

## User Stories

1. As a maintainer, I want permanent non-goals separated from deferred keywords, so that "out of
   scope" stops hiding work we intend to do.

2. As a maintainer, I want the gap categories to mean the same thing in every provider, so that counts
   are comparable.

3. As a maintainer, I want a deferred keyword to become `unmodelled` debt only when a pinned corpus
   entry uses it, so that the schema never becomes the backlog.

4. As a maintainer, I want each promotion to delete its ledger row, so that progress is visible in the
   corpus diff.

5. As a maintainer, I want a corpus entry per shape, so that adding `pages` and adding `secrets` are
   separately reviewable.

6. As a maintainer, I want the re-triage to be a diff with reasons, so that moving a row between
   categories is a reviewed decision.

7. As a maintainer, I want the provider page's open-gaps table to group by category, so that a reader
   sees decisions and debt apart.

8. As a consumer, I want `dependencies`, `inherit`, `start_in` and `manual_confirmation` eventually
   typed, because they are small fields that appear in ordinary pipelines.

9. As a consumer, I want `secrets`, `id_tokens` and `identity` typed when a real config needs them, so
   that auth configuration is not raw forever.

10. As a consumer, I want `pages` and `run` modelled only when there is evidence of their shapes, so
    that the DSL does not guess at deployment or Functions grammar.

11. As a maintainer, I want `rules:changes:compare_to` tracked with the rules slice, not as a separate
    keyword, so that its promotion follows the rule shape it belongs to.

12. As a maintainer, I want the completion target in one sentence, so that "done" is checkable.

13. As a maintainer, I want the next corpus entry pinned and hashed before its ticket is written, so
    that no implementer goes discovery-shopping.

## Implementation Decisions

1. **Two categories, one meaning each.** `out-of-scope` is reserved for architectural non-goals:
   resolving references, `spec`/inputs interpolation, multi-file or child-pipeline composition, a CLI,
   and schema refresh. Every ordinary keyword is either modelled, `unmodelled`, or `schema-noise`.

2. **The deferred keyword list is closed at the start of this slice.** `pages`, `secrets`, `id_tokens`,
   `hooks`, `identity`, `manual_confirmation`, `run`, `start_in`, `dast_configuration`, `inherit`,
   `dependencies` and `rules:changes:compare_to`. A keyword not on this list enters through a corpus
   entry like any other, not through the schema.

3. **A promotion is three edits in one ticket.** The keyword becomes a typed field; its corpus fixture
   moves the key out of `raw`; the ledger row is deleted. The gap report then replaces the keyword row
   with its still-missing children.

4. **Categories move by reviewed diff.** Re-triage changes `schema-gap-debt.json` only, with reasons
   that name the non-goal or the deferred decision. It adds no vocabulary.

5. **Corpus entries create the order.** A ticket is written only after its entry is pinned by commit,
   licence and hash, as in spec 0006. The same entry rules apply: verbatim, data comparison, no fixture
   edits.

6. **One corpus entry per keyword family.** `pages`, `secrets`, `id_tokens`/`identity`, `hooks`,
   `run`/`start_in`, `dast_configuration`, `inherit`/`dependencies`, and `manual_confirmation` are
   separate entries because their shapes do not coexist naturally.

7. **`rules:changes:compare_to` follows the Rule shape.** It is modelled as an optional `Text` on
   `Rule.changes`, not as a job keyword, and its ticket is grouped with any other rule widening.

8. **No new ADR for a straightforward field.** A deferred key that changes a settled shape (for
   example, `run` replacing `script`) gets an ADR; a plain field does not.

9. **The completion target is checkable.** The gap report's `out-of-scope` set equals the architectural
   list above; every other schema path is modelled, declared `unmodelled` with a reason, or
   `schema-noise`. The corpus ledger is empty for modelled keys.

10. **The provider page is the report.** Its open-gaps section is generated from the same lists, so the
    target and its evidence cannot drift.

## Testing Decisions

- **Seam.** `render(pipeline(...))` for every promoted field; corpus data equality for every new entry.
- **Gap report.** The shared walker's output is diffed against the modelled set; the stale-gap,
  orphaned-row, undeclared-path and overclaim assertions all stay in force.
- **No fixture edits.** A key that cannot be expressed is a ledger row, never an upstream edit.
- **Goldens.** A promotion adds a golden only for the new field; existing goldens change only where a
  key moves from `raw` to a field, and parsed data must be identical.
- **Prior art.** `test/corpus/gitlab-ci/schema-gap.test.ts`, the GitLab inventory, and the corpus tests
  from spec 0006.

## Out of Scope

- The architectural non-goals listed in decision 1.
- Refreshing the vendored schema.
- Bitbucket Pipelines.
- Modelling anything because the schema mentions it; the corpus remains the trigger.

## Further Notes

- This spec starts only after spec 0006's ticket 44 closes.
- Ticket numbers are coordinated with the Bitbucket and release work; check `docs/tickets/` on main
  before allocating.
- The first action is the re-triage, not a vocabulary ticket. Its counts decide the slicing.
- The current report is 1,061 schema paths: 165 modelled, 266 unmodelled, 103 schema noise, 527 under
  rows labelled out-of-scope. Those numbers are the baseline this spec starts from.
