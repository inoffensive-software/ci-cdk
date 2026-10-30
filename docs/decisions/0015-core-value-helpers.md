# 0015: the entry guard, the present wrapper and `Scalar` live in core

**Status:** Accepted

**Supersedes:** decision 9 of spec `docs/specs/0003-github-actions-breadth.md`, "`Scalar` is a
provider-local alias", to the extent that it keeps the alias in the provider and calls two providers
short of the bar. It supersedes no ADR; decision D6 of ADR 0002 is unchanged, because none of the
three additions names provider vocabulary.

## Context

Every provider lowers a modelled struct the same way, and each one had written the same two helpers
to do it:

- a guard that turns an optional field into zero entries or one (`entry`), because an absent field
  must emit no key at all rather than an empty one;
- a wrapper that leaves an absent field absent and sends everything else through the one boundary
  parser (`present`), so the author's key order and a numeric-looking string survive lowering.

Both are pure functions of core types: `entry` reads a `Doc | undefined`, `present` calls
`fromValue`. Neither knows a keyword, a document root or a provider's vocabulary. There were six
copies of `entry` and three of `present`, already drifting: one accepted a list of text, the others
did not.

`Scalar` has the same shape in two providers: `string | number | boolean | LeafNode`. It is the type
of an author-named map's values, which is why it is wider than `Text` (a tool may keep `0` and `"0"`
distinct) and wider than `Value` (a leaf decides its own style). Spec 0003 decision 9 put it in the
provider because two providers were not three.

`docs/principles.md` sets the bar the same way: two similar providers are not evidence of a shared
concept; three are. Three providers now lower fields through these helpers.

## Decision

Core exports the three, once:

- `entry(key, value)` returns `readonly DocEntry[]`: empty for `undefined`, one entry otherwise.
- `present(value)` returns `Doc | undefined`: `undefined` stays `undefined`, anything present is
  lowered with `fromValue`. It accepts a scalar, any `Value`, a list of `Text`, or an author-named
  record of scalars. The list is part of the union because a leaf is not a `Value` and a script may
  be a list of leaves.
- `Scalar = string | number | boolean | LeafNode`, beside `Text` in `doc.ts`.

The providers delete their copies and import these names from core. A provider barrel that published
`Scalar` keeps publishing it, by re-exporting the core type, so no consumer import breaks.

The union behind `present` stays internal. Callers pass data; only the function is the contract, so
the union can widen without a public break.

## Consequences

- No emitted byte changes. These helpers decide which keys exist and how they lower, and the
  implementations are identical to the ones they replace. Every golden and every corpus entry passes
  untouched, and no schema or corpus file is edited.
- Core gains no vocabulary. `entry`, `present` and `Scalar` name `Doc`, `Value`, `Text` and
  `LeafNode`, which core already owned. The provider-blindness test still finds no provider name
  under `src/core/`.
- One implementation per helper, so a fix or a widened union lands once. A fourth provider imports
  them instead of writing a seventh copy.
- The public surface grows by two functions and one type. They are data-layer helpers: no builder,
  no lifecycle and no defaulting.

## Alternatives

- **Keep the copies.** Rejected: they are already drifting, and the third provider is what the
  three-provider bar in `docs/principles.md` is for. The duplicated part is lowering mechanics, not
  vocabulary, so D6 does not cover it.
- **Export one generic `Field<T>` or a `Presentable` type.** Rejected: `present` does not transform
  the value, so a generic would only restate its parameter. An exported union would become a second
  public surface to keep compatible for no caller benefit.
- **Fold `present` into `entry`.** Rejected: `entry` takes a node and `present` produces one. A
  combined helper would have to accept the union and return entries, which hides the two decisions a
  reader needs to see: whether the key exists, and whether the value lowered.
