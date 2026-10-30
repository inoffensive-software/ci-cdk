# Corpus

Pinned real-world configs. Each provider's scope is defined by this corpus rather than by prose:
"supports X" means "reproduces the corpus configs that use X".

## Layout

```
test/corpus/<provider>/<name>.yml          the upstream config, vendored verbatim
test/corpus/<provider>/<name>.test.ts      reproduces it and asserts byte equality
test/corpus/<provider>/fixtures.ts         the definition each entry reproduces, one export per entry
test/corpus/<provider>/coverage-debt.ts    the ledger of raw paths the fixtures need, with reasons
test/corpus/<provider>/coverage.test.ts    asserts the ledger against the fixtures, both ways
test/corpus/<provider>/PROVENANCE.md       repo, commit SHA, path, licence for every entry
```

Definitions live in `fixtures.ts` rather than in the test so the ledger can walk every fixture in one
place; a `<name>.test.ts` loads its vendored file and compares the rendered string.

## Comparison rule

A corpus test renders the equivalent definition with `render(workflow, { header: "" })` and asserts
the whole string equals the vendored bytes. Nothing is normalised and nothing is re-read through a
YAML parser: a CRLF line ending, a missing trailing newline, a quoting difference or a trailing space
each fail the test.

That rule is what makes selection the hard part. The format contract permits exactly one comment
line at the top (which the corpus suppresses) and no blank lines, so an upstream config containing
comments or blank lines cannot be reproduced byte for byte and is **not** a corpus entry. The same
applies to any other mismatch: if a config cannot be reproduced as-is it stays out, or the mismatch
becomes a declared row in the ledger. It is never worked around by editing the vendored file.

## Rules

- **Pinned by commit, never `main`.** Upstream edits must not break the build; refreshing is a
  deliberate change recorded in `PROVENANCE.md`.

- **Verbatim, never edited.** A config we had to change is not evidence that we support the
  original. If it cannot be reproduced as-is, that is a coverage gap, not a fixture fix.

- **Licence recorded per entry.** Attribution goes in `PROVENANCE.md`; only configs whose licence
  permits redistribution belong here.

- **One fixture per shape.** Prefer configs whose features are distinct (matrix, needs graph,
  artifacts, caching, conditionals) over near-duplicates.

- **A config we designed for is not a corpus entry.** The corpus exists to find the keys the types
  do not model; at least one entry per provider should force `raw` until it is modelled.

## Coverage debt

`coverage-debt.ts` is the ledger: every raw path a fixture needs, plus one line saying why the DSL
cannot express it yet, either because the key is unmodelled or because the modelled key's emitted
style differs from upstream. `coverage.test.ts` walks the fixtures and asserts set equality in
both directions - a fixture that starts using `raw` without a row fails, and a row no fixture uses
fails. Adding a row is a deliberate widening of the escape hatch; deleting one is how a gap closes.
The fraction of the corpus needing `raw` is the roadmap.
