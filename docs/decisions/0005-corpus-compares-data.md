# 0005: the corpus compares data, not bytes

**Status:** Accepted

## Context

Ticket 14 and the corpus README pinned the strongest possible check: render the definition with the
header suppressed and assert the string equals the vendored bytes, with nothing normalised. Spec 0002
backs that up in three places - the "Two real, pinned, permissively licensed configs reproduced byte
for byte" line near the top, user story 46, and decision 17, which requires entries be comment-free
and blank-line-free _by selection_ and names `chalk/chalk` as the second entry. Ticket 15 then asked
for a second entry using "a different combination of shapes", which in practice means a real config
with several jobs, so `chalk` (one job, smaller than `got`) cannot serve.

A scan of roughly 1500 workflow files across ~120 permissively licensed repositories found that byte
equality is only reachable for hand-minimal YAML: one job, one matrix, no comments, no blank lines,
no author-chosen quoting, and a key order that matches the DSL's. Every substantive config fails on
presentation rather than vocabulary:

- blank lines, which the format contract forbids;
- quoting the emitter would not choose, such as `tags: ['*']` or `matrix: ['latest', '~7.0.0']`;
- flow-style collections such as `rust: [nightly, beta, stable]`, which core only emits when empty;
- key order the DSL fixes differently, such as `timeout-minutes` before `steps`.

Stripping blank lines alone was tried and surfaced no new entry: the blockers above are independent,
and three of the four are properties of the emitter, not of the corpus.

Meanwhile `docs/architecture.md` says the corpus is the definition of support because it is
measurable. A rule that only admits one shape of config measures the emitter's formatting, not the
provider's vocabulary.

## Decision

A corpus test compares **data**: the vendored file and the rendered output are both parsed with the
`yaml` package and the values must be deeply equal. The header is suppressed, because the vendored
file has none.

Byte equality is retained where an entry already achieves it (`got`), as an extra assertion inside
that entry's test, and `PROVENANCE.md` records which entries are `byte-identical` and which are `data`
only.

This supersedes, and is the record for, these anchors:

- the "asserts string equality against the vendored bytes, so a CRLF or trailing-newline difference
  fails rather than being normalised" rule in the corpus README and in ticket 14's acceptance list;
- spec 0002's "reproduced byte for byte" line, user story 46, and the byte-for-byte half of decision
  17, including its choice of `chalk/chalk` as the second entry - the corpus now carries
  `dtolnay/anyhow`, because it exercises a needs graph, a reusable-workflow job, two matrices, a
  schedule trigger and job and step `env`, none of which `got` or `chalk` reach;
- `docs/architecture.md`'s "Corpus round-trip ... asserted byte-identical" and "a provider is done
  when the corpus round-trips byte-identically" lines. "Done" now means every entry matches as data.

Everything else about the corpus still holds: entries are pinned by commit, vendored verbatim, never
edited, and licence-recorded, and any key the vocabulary cannot express is still `raw` plus a
declared ledger row.

## Consequences

- Key order, quoting, flow versus block collections, blank lines and comments no longer affect a
  corpus entry, so real configs of any size can be added. Ticket 15's entry is dtolnay/anyhow's
  nine-job CI.
- The suite no longer proves that the emitter reproduces another project's formatting. It proves that
  every key, value and nesting in the entry is expressible and lowers to the same data, which is the
  claim "supports GitHub Actions" was always making.
- Types are still pinned by the comparison: a quoted `"10"` where upstream has the number `10` is a
  different parsed value, so the typed-scalar rules stay under test.
- The coverage ledger now records two kinds of row: vocabulary gaps, which are the roadmap, and
  byte-fidelity devices such as `got`'s two `raw.run` entries, which exist only because that entry is
  also compared byte for byte. The README says which is which, so the roadmap metric stays honest.

## Alternatives

- **Strip blank lines only.** Rejected: measured, and it changes nothing. Quoting, flow style and key
  order block every substantive config found.
- **Extend `Doc` with flow collections and styled scalars, then keep byte equality.** Rejected for
  now: it is a core format change that freezes every golden while the tree gains a presentation
  dimension no consumer asked for. It remains available if byte fidelity becomes a goal again.
- **Keep byte equality and ship a ~500-byte single-job entry.** Rejected: it would make ticket 15's
  "different combination of shapes" untrue, and the corpus would still be measuring formatting.
