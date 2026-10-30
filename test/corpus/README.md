# Corpus

Pinned real-world configs. Each provider's scope is defined by this corpus rather than by prose:
"supports X" means "reproduces the corpus configs that use X".

## Layout

```
test/corpus/<provider>/<name>.yml     the upstream config, vendored verbatim
test/corpus/<provider>/<name>.ts      DSL code that must reproduce it
test/corpus/<provider>/PROVENANCE.md  repo, commit SHA, path, licence for every entry
```

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
