# 0011: documented grammar is gated, not assumed

**Status:** Accepted

**Supersedes:** none. This ADR adds a gate beside the exhaustiveness gate; it does not change ADR 0005,
the coverage ledger or the corpus.

## Context

The coverage claim is extensional: six pinned configs reproduce as data and the exhaustiveness gate
proves that every key they use is modelled. Nothing compares that modelled set with the grammar the
vendored schema allows. A schema refresh therefore changes which documents are rejected and nothing
about what the vocabulary is known to omit: the gap can widen without a test changing.

The vendored schema is already in the repository and is already used as a validator, so the missing
comparison is between two sets that both exist: the key paths the schema allows from its root, and the
key paths the inventory can emit. The walker from ticket 29 produces the first with the same
author-named list the exhaustiveness gate uses; `inventoryPaths()` produces the second. Both are sorted
and de-duplicated, and both use the diagnostic notation, so a path found here can be pasted into the
gate unchanged.

## Decision

The suite compares the two sets in both directions.

- A schema path the inventory does not model is a **gap**: documented grammar the provider cannot emit.
  Every gap is either modelled or declared in `GAPS` beside the provider corpus
  (`test/corpus/github-actions/schema-gap-debt.ts`, re-exported with the diff from `schema-gap.ts`).
- A modelled path the schema does not enumerate is an **overclaim**: the vocabulary writes a key the
  path-set comparison cannot find in the schema. Every one is either fixed or declared in `OVERCLAIMS`
  in the same file.
- A path neither modelled nor declared fails the suite, naming the path and both remedies: model it in
  the vocabulary, or add a row. A declared row with no matching path fails too, so neither list can
  absorb the other's rows or accumulate rows nobody needs.

`GAPS` rows carry a `reason` and a `category`; `OVERCLAIMS` rows carry a `reason`. The category
vocabulary is closed to three values:

- `unmodelled` — vocabulary this provider should gain. Only this category is debt.
- `out-of-scope` — a shape the provider document's non-goals already name. The row exists so the
  decision is visible, not to queue work.
- `schema-noise` — the schema plainly permits something GitHub does not document. A large count here
  is a fact about the schema, not a failure of the provider.

An overclaim has no category: each is either a stale schema, an imprecise schema, or a bug, and the
`reason` says which.

The overclaim list at the time of writing, in full:

| Path                        | Reason                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `$.on.*.inputs.*.options`   | `workflowDispatchInput` declares it, but `workflow_dispatch` has a sibling `oneOf` beside its `$ref`; draft-07 ignores it.       |
| `$.on.*.inputs.*.options[]` | The element path of that unreachable `options` declaration.                                                                      |
| `$.on.*.types[]`            | `types` is a bare array with no `items`, so the walk sees the array but not its element; GitHub documents string activity types. |

The `GAPS` list is the roadmap and is expected to be long; it lives in the test module rather than in
this ADR so that a row can be added or deleted with the diff's tests, not by editing a decision record.

### Refresh rule

The vendored schema is refreshed manually; it is never fetched during a run. A refresh is a deliberate
change with its own review, and its origin and date stay in `docs/references/upstream-schemas.md`. Any
path a refresh introduces is neither modelled nor declared, so the suite fails until someone models it
or adds a row with a reason and a category. A refresh can therefore narrow or widen the gap only through
a review, never as a side effect of updating the file.

## Consequences

- "Supported" has a size: the documented grammar is a set of paths, and the part the provider cannot
  emit is a list of named rows with reasons rather than an absence of evidence.
- Adding a gap row is a deliberate widening of the declared debt. Deleting one is the definition of
  closing a gap, exactly as with the coverage ledger.
- The comparison runs inside the normal suite and is provider-local; the walker stays shared under
  `test/schemas/`, so the next provider's schema uses it rather than a copy.
- No vocabulary is built here. Triage classifies; the corpus still creates the obligation to implement.
- The comparison is structural. It measures key paths and nothing about values, so expression parsing
  and scalar semantics remain outside the claim.
- A path that differs only by `[]` placement is a real disagreement, not a formatting detail; the
  `reason` on the affected row says which side is right.

## Alternatives

- **Treat the schema as the backlog and model every path it allows.** Rejected: the schema is loose
  and, in places, wrong. The corpus is the only evidence of what users write, and it stays the signal
  that creates work.
- **Let an undeclared schema path warn instead of fail.** Rejected: a warning is invisible in review,
  and the whole point is that a refresh must surface as a decision.
- **Generate the declared lists from the diff on every run.** Rejected: a generated list would accept a
  refresh silently, which is the failure this gate exists to prevent. The lists must be edited by a
  person and reviewed.
- **Compare against a hand-written inventory of GitHub's grammar.** Rejected: it would rot against the
  documentation and duplicate what the schema already says.
