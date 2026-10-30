# 0006: an event with no options emits `null`

**Status:** Accepted

## Context

Ticket 08 decided that a documented event taking no options "emits as an empty map, not as a null or a
blank key", and `render` did exactly that: `on: { push: {} }` lowered the empty options object through
the boundary parser and produced `push: {}`.

Real configs write the bare form - the second corpus entry's trigger block is `push:` with no value,
`pull_request:`, `workflow_dispatch:` - and a bare key in YAML parses to `null`. Once corpus entries
are compared as data (ADR 0005), `{}` and `null` are different values, so `on: { push: {} }` could not
express what every one of those files actually contains. Emitting `{}` was also a lie about the source:
nobody writes `push: {}`.

## Decision

An event whose options object is empty lowers to `null`, so `on: { push: {} }` emits `push: null`.
`null` parses to exactly the value a bare `push:` produces, which is what the upstream file means and
what the vendored GitHub schema accepts for the event object.

This supersedes the "emits as an empty map, not as a null or a blank key" acceptance line of ticket 08
and the `EmptyTrigger` docstring in `trigger.ts`. The rest of ticket 08 - the closed event union, author
order for options, and `workflow_call` as a bare event name - is unchanged.

## Consequences

- A bare event now reproduces the data in real files, which is what the corpus needs. The DSL stays
  slightly terser-looking than the file: `null` is explicit where upstream writes an empty value, and
  emitting a truly empty scalar would need a new core node.
- Output changes for every workflow that sets an event with no options. `src/github-actions/
  __snapshots__/bare-events.yml` pins the new bytes.
- Nothing else moves: an event with options, a string event name and an event sequence all lower
  exactly as before.

## Alternatives

- **Keep `{}` and teach the corpus comparison that `{}` equals `null`.** Rejected: it would put a
  special case for our own output into the comparison rule, and it would leave the emitter writing a
  form no real config uses.
- **Emit a blank value (`push:`) by adding an implicit-null node to core.** Rejected for now: a core
  format change for cosmetic gain, and `push: null` already parses to the same thing.
