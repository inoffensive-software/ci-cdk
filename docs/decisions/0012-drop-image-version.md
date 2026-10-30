# 0012: `image_version` leaves the trigger vocabulary

**Status:** Accepted

**Supersedes:** none. This ADR closes the prose note ADR 0011 left in the provider document; it does not
change the gate, the category vocabulary or the refresh rule.

## Context

The trigger vocabulary typed `image_version` as an event with `names` and `versions` filters, and
`triggers.test.ts` proved the filters emitted as written. The vendored schema never allowed the event:
GitHub removed it, so a workflow carrying the key is rejected by the validator the corpus already runs.

Holding an arm no document can use had a cost. The inventory may only hold schema-valid documents, so
no corpus entry could exercise the arm, and the coverage ledger could never see it. The modelled set the
documented-grammar diff compares is inventory-derived for the same reason, so the arm was invisible to
both directions of that diff: it was not a gap, because the schema does not enumerate it, and it was not
an overclaim, because the inventory was forbidden to hold it. The only record was a prose note under
Non-goals, where a reader looking for support found a type the provider shipped.

No corpus entry used the event, and a search of public workflows on 2026-10-29 found none using it. The
typed arm was therefore unproven as well as invalid.

## Decision

`image_version` is removed from the trigger vocabulary: the `EventName` member, the `ConfiguredEvent`
union, the `ImageVersionFilter` interface and the `Triggers` entry all go, and the provider test that
covered the filters goes with them. `ImageVersionFilter` was exported only for this arm, so it leaves the
barrel too. The provider document's Non-goals note and the paragraph that pointed at it are removed,
because neither statement is true once the type is gone.

## Consequences

- The public surface loses a type and an event name. A caller that wrote `image_version` was writing a
  workflow GitHub rejects, so the removal turns a runtime rejection into a typecheck error.
- No declared row moves: the arm was in neither `GAPS` nor `OVERCLAIMS`, and the schema path count is
  unchanged.

## What would have caught it

A comparison at the type level: the vocabulary's event names against the schema's `on` property names
would have shown an arm with no schema counterpart without needing an inventory document. That
comparison is separate work and is not made here; this ADR records the removal so the next reader does
not mistake the diff's silence for agreement.
