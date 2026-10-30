# Architecture

`@inoffensive/ci-cdk` compiles typed TypeScript into CI provider configuration. You write `ci.ts`,
run it, and commit the emitted YAML. This document is the contributor-facing account of how the
package is put together and why.

User-facing usage lives in the README. Decisions that were debated and settled live in
`docs/decisions/`. Per-provider scope and coverage live in `docs/providers/<provider>.md`, with the
template in `docs/providers/README.md`.

## What this is, and what it is not

It is a typed constructor for provider configuration, plus a composition mechanism: shared
functionality is a function returning a provider struct, imported and spread where needed. The unit
of composition is code, not YAML links, so two pipelines built from the same function emit identical
bytes. Providers keep their own vocabulary and types; see `docs/decisions/0002-founding-decisions.md`.

Non-goals, stated so they are not designed for by accident:

- Partial file editing. A generated file is wholly owned and wholly rewritten.
- One definition emitting several interdependent files. Multiple files means multiple definitions.
- Resolving cross-file references. `include:` and `uses: ./.github/workflows/x.yml` may be written
  as strings; they are never loaded, resolved, or verified.
- A CLI. The package exports functions; orchestration is the consumer's script.
- Deep/structural diffing. Drift is byte inequality; `git diff` is the diff.

## Layers

Three stages, each with exactly one axis of variance:

```
typed structs (provider vocabulary)   --toDoc()-->   Doc   --renderDoc()-->   text
              per provider                      shared, provider-blind       Serializer
```

- **Structs** are plain readonly objects using the provider's own key names (`runs-on`, not
  `runsOn`). They compose by object spread and array literals. Builders are near-identity; they
  exist as typed inference anchors and documentation.

- **`Doc`** is an ordered, style-annotated tree: arrays of `{ key, value }` entries rather than
  records, scalars carrying `plain | single | double | literal | folded` and an optional tag. It is
  a YAML superset on purpose. Tags exist for GitLab's `!reference`, and core also tags the three
  leaves whose text is a legal string (`!!null`, `!!bool`, `!!str`) so a literal and its spelling
  stay distinct (ADR 0010); literal style exists for shell scripts. Every one of these must be
  expressible or they leak into the emitter as provider special-cases.

- **`renderDoc`** walks a `Doc` and produces text. It knows nothing about CI. Alternate targets (JSON
  today, TOML later) are additional `Serializer` implementations, never provider-owned forks.

`Doc` is the translation layer. Its entire reason to exist is making the third stage provider-agnostic.

## Leaf values

A leaf constructor (`expr`, `script`, `tagged ref`) returns a small object rather than a branded
string, carrying a symbol-keyed method that returns its own `Doc` node:

```ts
export const DOC: unique symbol = Symbol("ci-cdk/doc");

export interface LeafNode {
  readonly [DOC]: () => Doc;
  readonly toString?: () => string; // debugging only
}

// provider
export const expr = (
  strings: TemplateStringsArray,
  ...values: readonly (string | number)[]
): LeafNode => ({
  [DOC]: () => scalar(`\${{ ${interpolate(strings, values)} }}`, { style: "double" }),
  toString: () => `\${{ ${interpolate(strings, values)} }}`, // debugging only
});
```

The leaf owns its own style, and `fromValue` recurses into anything carrying `DOC` without knowing
which provider produced it. This is required, not cosmetic: a plain-style scalar containing `: `
or ` #` is invalid YAML, and GitHub expressions routinely contain both
(`\${{ format('{0}: {1}', a, b) }}`). A branded string would be indistinguishable from a plain
string at the `fromValue` boundary and would emit exactly that broken output.

Consequence for provider types: any field that accepts an expression is typed `Text = string |
LeafNode`, not `string`. The alias lives in core because it is provider-neutral. So provider
structs read `readonly if?: Text` and `env?: Readonly<Record<string, Text>>`, and a leaf can be
passed anywhere a string is accepted.

## Emitted format

The contract, pinned by golden tests. Every line here is deliberate, and changing one is a breaking
change for every consumer.

- Two-space indent and block style for every non-empty collection; the only flow style is the empty
  form below.
- Sequences are indented under their key (`indentSeq`), matching GitHub's own examples. A sequence
  at the document root starts at column 0.
- An empty map is `{}` and an empty sequence is `[]`. Flow style appears only for the empty case,
  because block style has no way to express zero entries.
- `lineWidth: 0`. The `yaml` default of 80 wraps long plain scalars, which would make a `run`
  command's emitted form depend on where column 80 falls.
- Key order is insertion order from `toDoc`. Never sorted, never re-ordered by the serializer.
- The header is the only comment, rendered `# <text>` with a space after the hash, and is not
  followed by a blank line.
- No other comments, and no blank lines outside a block scalar.
- Output is LF only and ends with exactly one newline. An open block scalar whose text ends in blank
  lines keeps them: they are content, not trailing layout.
- GitHub Actions' `run` field and its opt-in `script` leaf are literal block scalars. A field lowered
  through the boundary parser keeps plain style, as GitLab's `script` does. Anything carrying a `DOC`
  leaf decides its own style; nothing else is inferred.
- Tags survive: GitLab's `!reference` emits as a tagged scalar.

## Core surface

Core is a data layer, not a domain layer. The admission test for anything entering it: can you
describe the thing without naming a provider? If not, it belongs in a provider directory.

```
src/core/doc.ts         the Doc union, Scalar and its constructors (map, seq, scalar, block, tagged)
src/core/fields.ts      entry(): the absent-field guard; present(): lower a field or leave it absent
src/core/from-value.ts  fromValue(unknown) -> Doc: the boundary parser
src/core/canonical-number.ts  the canonical-number predicate fromValue and the serializer share
src/core/value.ts       Value: the precise recursive type data has after the boundary
src/core/render-doc.ts  renderDoc(doc, options) -> string  (provider-author API)
src/core/serialize.ts   Serializer interface; the YAML implementation
src/core/io.ts          write(path, text): UTF-8, LF, one trailing newline, never creates directories
src/core/errors.ts      Diagnostic, DiagnosticError, fail(), formatDiagnostics()
src/core/omit-undefined.ts  omitUndefined()
```

Roughly eight exports and no CI nouns. A test asserts that no provider name appears under
`src/core/`, so this stays true.

## Provider surface

```
src/github-actions/
  index.ts      barrel; re-exports render, toDoc and the vocabulary
  render.ts     render(wf) = renderDoc(toDoc(wf)), the call users make
  types.ts      the provider's structs and unions
  leaves.ts     expr, script, matrix, needs
  to-doc.ts     the single lowering function; public as `toDoc`
  on-doc.ts     `on:` lowered to a Doc, so a bare event becomes `null`
  validate.ts   document-level checks
  trigger.ts    the `on:` vocabulary

src/gitlab-ci/
  index.ts      barrel; re-exports render, toDoc and the vocabulary
  render.ts     render(pipeline) = renderDoc(toDoc(pipeline)), the call users make
  types.ts      the structs `Pipeline` and `Job`, and the `Script` union
  to-doc.ts     the single lowering function; public as `toDoc`
  validate.ts   document-level checks

src/bitbucket-pipelines/
  index.ts          barrel; re-exports render, toDoc and the vocabulary
  render.ts         render(config) = renderDoc(toDoc(config)), the call users make
  types.ts          the provider's structs and item unions
  to-doc.ts         the single lowering function; public as `toDoc`
  step-doc.ts       a step body lowered, reused at every pipeline position
  item-doc.ts       the pipeline item union lowered
  validate.ts       document-level checks
  item-problems.ts  the item-level checks `validate` collects
```

`render` and `toDoc` are the public surface in all three providers; the reasoning is in
`docs/decisions/0003-to-doc-public.md`, `docs/decisions/0008-gitlab-public-surface.md` and
`docs/decisions/0013-bitbucket-public-surface.md`. Nothing else in a provider directory is imported
by consumers.

Providers import from core, never from a sibling provider. Duplicated vocabulary across providers
is deliberate: `Cache` in GHA and `cache:` in GitLab differ in ways that only reveal themselves
after both are written, and an abstraction extracted with three examples is a refactor while one
extracted from two is a commitment.

`jobs` is a map keyed by job id in GitHub Actions and GitLab, not a sequence. The struct holds an
array so that composition is spread and concat; `toDoc` lowers it to an ordered map, preserving array
order. Duplicate ids are a diagnostic, never a last-wins overwrite.

## Invariants

These are testable and should be enforced by tests, not by review.

1. `renderDoc` is pure and deterministic. Same `Doc` through two fresh module graphs yields identical
   bytes, LF only, and exactly one trailing newline outside an open block scalar.

2. `renderDoc` is provider-blind. `src/core/` never imports a provider, which the zone rules in
   `.fallowrc.json` enforce, and no provider identifier appears in its source, which a test enforces.
   The same zones make providers mutually unimportable.

3. `toDoc` is the only place that validates a whole document, and the only place that throws
   `DiagnosticError`. Duplicate job ids, dangling `needs` and dependency cycles cannot be caught
   earlier, because build time has no whole document.

4. Builders never validate and never merge. They return their input, typed.

5. Structs are spreadable: no getters, no methods, no hidden state, no class instances.

6. Every emitted file begins with the header line, which is the one permitted comment, and that line
   contains no timestamp and no package version.

7. Emitted formatting is a public contract. Quoting, key order, indentation and newline policy are
   frozen behind golden tests; changing them is a breaking change.

8. `Doc` is a superset of every target's needs. A serializer may ignore a style or reject a tag;
   it may not require a core change.

9. Scalar style travels with the value. Anything whose style matters is a `DOC`-carrying leaf
   object, so `fromValue` never infers style from content.

## Decisions

Contested calls live in `docs/decisions/` with their reasoning and rejected alternatives;
this table is policy, plus pointers.

| Decision                                                           | Rationale                                                                                                                                                                                                                               | Cost                                                                                                                                          |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `fromValue` value-level only                                       | Decides JS-to-tree semantics exactly once, and is the only safe path for `unknown` data                                                                                                                                                 | Used on a whole struct it bypasses the typed layer, so unmodelled keys pass silently                                                          |
| Types hand-written, schema as oracle                               | Schemas here are loose draft-07 unions with no discriminators; generated types are unusable for a DSL                                                                                                                                   | Types can drift from the spec and only corpus tests will notice                                                                               |
| `yaml` (eemeli), pinned exact                                      | Ordered maps, scalar styles, custom tags and a CST out of the box; hand-rolling quoting is weeks of subtle bugs                                                                                                                         | Its output is part of the format contract, so upgrades are deliberate and may change emitted bytes                                            |
| Errors are exceptions, defined in core                             | `DiagnosticError` carries `{ path, message, hint }[]`; a definition that cannot lower is a program error, and the caller's script owns presentation                                                                                     | Callers must catch to report nicely; nothing forces them to                                                                                   |
| `renderDoc` takes `{ header?: string }` and nothing else           | One knob that users actually asked for; no configuration for taste that has not been needed                                                                                                                                             | A second target needing more options forces a widening later                                                                                  |
| GHA, then GitLab, then Bitbucket                                   | GHA has the largest grammar and is best placed to stress the core                                                                                                                                                                       | Bitbucket's grammar gets the least scrutiny, correctly, last                                                                                  |
| `write` never creates directories                                  | Thin write; the caller owns the path                                                                                                                                                                                                    | First run in a clean tree fails unless the directory exists                                                                                   |
| `any` never; `unknown` only at a boundary                          | `any` is unchecked by definition. `unknown` is permitted in the parser that turns untyped input into a valid type, and nowhere downstream. `fromValue` takes `unknown` because interfaces are not assignable to an index-signature type | Anti-slop's `no-unknown-parameters` and `no-object-parameters` are off for that one file; `typescript/no-explicit-any` is at error everywhere |
| `Value` for data crossing a boundary                               | A precise recursive type instead of `unknown`, and YAML cannot encode a function anyway                                                                                                                                                 | Interfaces are not assignable to it, so it types callers' data (`raw`), never our own structs                                                 |
| Header default: `# Generated by @inoffensive/ci-cdk. Do not edit.` | One fixed line, no timestamp and no version, so regenerating never churns the file                                                                                                                                                      | `{ header: "" }` removes it, which makes a hand-edit invisible in review                                                                      |

## Build order

Each step is testable on its own, and later steps assume the earlier ones.

1. `Doc` and `fromValue`, with the YAML-trap tests. No provider, no CI nouns.
2. `renderDoc` over `yaml`, with the determinism test and the first formatting golden.
3. `errors` and `omitUndefined`. Small, but everything that validates needs them.
4. `src/github-actions/types.ts` and `leaves.ts`: the vocabulary, and `expr`/`script` returning
   `DOC` leaves.
5. `to-doc.ts` and `validate.ts`, then `render.ts`, then the first whole-workflow golden.
6. One corpus entry: the smallest real config, reproduced as data (ADR 0005).
7. Breadth: more corpus entries until the exhaustiveness test reports nothing unmodelled.

The order matters because `Doc` is the seam every other decision depends on, and the corpus cannot
begin until a whole document round-trips once.

## Open decisions

None outstanding.

## Testing

- **Golden emission** per fixture, next to the emitter, reviewable in diffs.
- **Schema conformance**: emitted YAML validated against the upstream schema vendored at
  `test/schemas/<provider>.json`, refreshed on demand rather than gating CI on upstream churn.
- **Determinism**: two renders through fresh module graphs, byte-identical.
- **YAML traps**: `on:` as a key, `yes`/`no`, `1.10`, and an expression containing `: `.
- **Corpus round-trip**: a pinned set of real public configs, each reproduced by a test under
  `test/corpus/<provider>/` and compared as parsed data (ADR 0005); an entry that also matches byte
  for byte asserts that too. Pinned by commit so upstream changes cannot break the build.
- **Exhaustiveness**: any key in the corpus the DSL cannot express fails the test, unless covered
  by `raw`, in which case it is reported as coverage debt. The fraction of the corpus needing
  `raw` is the roadmap.

## Provider "done"

A provider is done when the corpus round-trips, every corpus key is either modelled or counted
against `raw`, and the document-level validations (duplicate ids, dangling references, cycles) run in
`toDoc`. Round-trip means equal as parsed data (ADR 0005), with byte equality asserted for the entries
that reach it. Coverage of the written spec is not the target; coverage of real configs is, because it
is measurable and the spec is not.
