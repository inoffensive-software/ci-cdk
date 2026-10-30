# Corpus

Pinned real-world configs. Each provider's scope is defined by this corpus rather than by prose:
"supports X" means "reproduces the corpus configs that use X".

## Layout

```
test/corpus/<provider>/<name>.yml          the upstream config, vendored verbatim
test/corpus/<provider>/<name>.test.ts      reproduces it and asserts equal data
test/corpus/<provider>/<name>.fixture.ts   one fixture per file
test/corpus/<provider>/coverage-debt.ts    the ledger of raw paths the fixtures need, with reasons
test/corpus/<provider>/coverage.test.ts    asserts the ledger against the fixtures, both ways
test/corpus/<provider>/PROVENANCE.md       repo, commit SHA, path, licence for every entry
```

The corpus tests import the entries they walk; a `<name>.test.ts` loads its vendored file and compares
the data.

## Comparison rule

A corpus test renders the definition with `render(workflow, { header: "" })` and compares **data, not
bytes**: the vendored file and the rendered output are both parsed with the `yaml` package, and the
two values must be deeply equal.

Maps are unordered in YAML and styles are presentation, so key order, quoting, block versus flow
collections, blank lines and comment-free-ness do not affect the result. Everything that carries
meaning does: a missing key, a key the vocabulary cannot emit at all, a wrong value, a wrong nesting,
or a scalar of the wrong type (a quoted `"10"` where upstream has the number `10`). Editing the
vendored file remains forbidden: if the data cannot be expressed, that is a coverage gap.

The header is suppressed because the vendored file has none. No entry is compared byte for byte;
`PROVENANCE.md` records `data` as the comparison level for every entry. ADR 0005 records why the rule
is semantic.

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

`coverage-debt.ts` is the ledger: every raw path a fixture needs, plus one line saying why. Every row
is a vocabulary gap: the key is not modelled. An empty ledger means the vocabulary can express every
key the corpus uses.

`coverage.test.ts` walks the fixtures and asserts set equality in both directions - a fixture that
starts using `raw` without a row fails, and a row no fixture uses fails. Adding a row is a deliberate
widening of the escape hatch; deleting one is how a gap closes. The rows are the roadmap.
