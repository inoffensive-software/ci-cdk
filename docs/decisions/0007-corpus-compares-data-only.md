# 0007: the corpus compares data only

**Status:** Accepted

## Context

ADR 0005 made a corpus test compare parsed data and retained byte equality for the one entry that
already achieved it, `got`, as an extra assertion inside that entry's test. Because the modelled `run`
field emits a literal block while upstream writes a one-line plain scalar, satisfying that extra
assertion forced `got`'s two run steps through `raw.run`. The coverage ledger therefore had two kinds
of row: vocabulary gaps, which are the roadmap, and byte-fidelity devices, which exist only to keep one
entry's formatting assertion green.

That second kind is not a gap. It made "a fixture uses `raw`" ambiguous at exactly the point the
exhaustiveness gate needs it to be precise: a corpus key outside the modelled set is either a
vocabulary gap or a formatting workaround, and only the first belongs in the roadmap. It also meant a
fixture could use `raw` for a key the vocabulary already models, which the gate must reject.

## Decision

Every corpus entry is compared as data, and no entry is compared byte for byte. `got`'s two run steps
use the modelled `run` field and its test asserts parsed-data equality like every other entry's test.
The ledger has exactly one kind of row: a vocabulary gap, where the key has no modelled field. An
empty ledger means the vocabulary can express every key the corpus uses, and therefore that "a fixture
uses `raw`" and "the vocabulary cannot express the key" are the same statement.

This supersedes these anchors, and nothing else in ADR 0005:

- ADR 0005's decision sentence "Byte equality is retained where an entry already achieves it (`got`),
  as an extra assertion inside that entry's test, and `PROVENANCE.md` records which entries are
  `byte-identical` and which are `data` only", and the consequence that describes the ledger as
  holding two kinds of row;
- the corpus README's "Comparison rule" paragraph that says byte equality is still asserted for `got`,
  and its "Coverage debt" section that declares two kinds of row legal;
- the two-kind row description in the docstring of `test/corpus/github-actions/coverage-debt.ts`.

ADR 0005's rule still stands: a corpus test renders with `{ header: "" }` and compares the parsed
values, so key order, quoting, flow versus block collections, blank lines and comments do not matter
while values and their types do. Entries remain pinned by commit, vendored verbatim, never edited and
licence-recorded, and a key the vocabulary cannot express is still `raw` plus a declared ledger row.

## Consequences

- `PROVENANCE.md` records `data` for `got` as it already did for every other entry, so the comparison
  level is one value rather than a per-entry claim nobody tests.
- `got` no longer exercises `raw` and its two ledger rows are gone. It still reproduces the vendored
  file's data, which is the claim the corpus exists to make.
- A fixture that uses `raw` on a modelled key is now unambiguously a defect rather than a formatting
  device. The exhaustiveness gate can treat every `raw` path as a declared vocabulary gap and reject
  `raw` on any key the inventory contains.
- Emitted output does not change: no valid document rendered differently before or after this record.

## Alternatives

- **Keep byte equality for `got` and teach the ledger to tag row kinds.** Rejected: it preserves a
  second assertion no other entry carries, keeps `raw` on a modelled key, and leaves the gate unable
  to tell a gap from a formatting workaround without reading a tag.
- **Change `run` to emit a plain scalar when the script is one line.** Rejected: it is a core format
  change for one entry, and a literal block is the form the modelled field promises for every script.
