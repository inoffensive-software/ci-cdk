# 0004: corpus key order wins over the documented order

**Status:** Accepted

## Context

Spec 0002 decision 8 says lowering emits in a fixed declared order "matching the order GitHub
documents", so two definitions that differ only in property order emit identical bytes. The first
corpus entry, `sindresorhus/got` at `66d0623`, does not follow that order: it writes `strategy` before
`steps`, and `fail-fast` before `matrix` inside `strategy`. GitHub's own reference documents the
opposite order in both cases.

The corpus test asserts byte equality with the vendored file, and `docs/architecture.md` says a
provider is done when the corpus round-trips, "coverage of real configs is [the target], because it
is measurable and the spec is not". A fixed order that disagrees with the pinned config cannot
satisfy both statements, so one of them had to move.

YAML mapping order carries no meaning to GitHub, so the choice costs nothing in correctness; it only
changes the bytes a consumer's diff sees.

## Decision

Where the pinned corpus and the documented order disagree, the corpus order wins:

- `Job.strategy` is emitted directly after `runs-on`, which is where the vendored entry puts it. The
  evidence covers its position before `steps`; placing it ahead of `environment`, `concurrency`,
  `outputs`, `env`, `defaults` and `timeout-minutes` follows from that single move and has no corpus
  evidence yet, because no pinned config sets both.
- `Strategy` emits `fail-fast`, then `matrix`, then `max-parallel`. `fail-fast` before `matrix` is
  evidence; `max-parallel` keeps its documented position until an entry says otherwise.

This supersedes the "matching the order GitHub documents" clause of spec 0002 decision 8 and the
"documented key order" comment on `Job`; the fixed-order half of that decision still holds. A future
divergence is handled the same way and recorded as a successor to this ADR rather than by editing a
vendored file.

## Consequences

- Emitted job bodies change for any job that sets `strategy`: it now appears above the job body
  instead of below `steps`/`timeout-minutes`. This is a breaking format change; the provider is
  pre-1.0 and the goldens are the contract, so they were regenerated in the same commit.
- `render` output now diffs cleanly against real configs written in this style, which is the point:
  the corpus is the definition of "supports GitHub Actions".
- The order is still fixed and independent of the author's property order; only the anchor moved from
  the docs to the corpus.

## Alternatives

- **Keep the documented order and drop the entry.** Rejected: both configs pinned by spec 0002 are
  written this way, so no vendored entry would contain a matrix job and the "supports" claim would be
  a claim about a config we chose not to test.
- **Normalise key order when comparing.** Rejected: it would re-read through a YAML parser and hide
  exactly the byte differences the corpus exists to catch.
- **Express `strategy` through `raw` for this entry.** Rejected: `raw` appends after the modelled
  keys, so it moves the block further away, and it would inflate the coverage-debt ledger with a key
  the vocabulary does model.
