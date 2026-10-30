# Provider specs

One file per provider: `docs/providers/<provider>.md`. It states **scope**, never design. The shape,
invariants and emitted format live in `docs/architecture.md`; link to them, do not restate.

## Sections

- **Scope**: the provider, the file(s) it owns, its subpath export.
- **Coverage**: a table of grammar areas, grouped the way the provider documents them. Generated
  from the corpus test, never maintained by hand.
- **Corpus**: the vendored configs with repo and commit. This is the definition of done.
- **Quirks**: shapes that look wrong and are correct, such as `on` as a key, or `step:` versus
  `steps:` in Bitbucket.
- **Non-goals**: what is deliberately unsupported, and the `raw` workaround for the rest.
- **Open gaps**: keys the corpus uses that are not modelled yet.

## Rules

- Done means the corpus reproduces (each entry equal as parsed data, ADR 0005; byte equality where an
  entry reaches it), every corpus key is modelled or counted against `raw`, and the `toDoc`
  validations run. Coverage of the written spec is not the target.
- A coverage claim is a link to a corpus test, never prose.
- Never copy invariants, the emitted format contract or decisions into a provider file. If it is true
  of every provider, it belongs in `docs/architecture.md`.
- Start from the corpus, not from the provider's documentation. A spec written from the docs covers
  the grammar that exists; a spec written from configs covers the grammar that is used.
