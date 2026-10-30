# Architecture

`@inoffensive/ci-cdk` compiles typed TypeScript into CI provider configuration. You write `ci.ts`,
run it, and commit the emitted YAML. This document is the contributor-facing account of how the
package is put together and why.

User-facing usage lives in the README. Decisions that were debated and settled live in
`docs/decisions/`. Per-provider coverage and quirks are not written yet; when they are, they live in
`docs/providers/<provider>.md`.

## What this is, and what it is not

It is a typed constructor for provider configuration, plus a composition mechanism: shared
functionality is a function returning a provider struct, imported and spread where needed. The
unit of composition is code, not YAML links, so two pipelines built from the same function emit
identical bytes.

It is not an ORM. Providers keep their own vocabulary, their own warts, and their own types. There
is no provider-neutral pipeline model and there will not be one.

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
  a YAML superset on purpose. Tags exist for GitLab's `!reference`; literal style exists for shell
  scripts; both must be expressible or they leak into the emitter as provider special-cases.

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
}

// provider
export const expr = (strings: TemplateStringsArray, ...values: readonly unknown[]): LeafNode => ({
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

## Core surface

Core is a data layer, not a domain layer. The admission test for anything entering it: can you
describe the thing without naming a provider? If not, it belongs in a provider directory.

```
src/core/doc.ts         the Doc union and its constructors (map, seq, scalar, block, tagged)
src/core/from-value.ts  fromValue: arbitrary plain values -> Doc
src/core/render-doc.ts  renderDoc(doc, options) -> string  (provider-author API)
src/core/serialize.ts   Serializer interface; the YAML implementation
src/core/io.ts          write(path, text)
src/core/errors.ts      Diagnostic, DiagnosticError, fail(), formatDiagnostics()
src/core/omit-undefined.ts  omitUndefined()
```

Roughly eight exports and no CI nouns. A test asserts that no provider name appears under
`src/core/`, so this stays true.

## Provider surface

```
src/github-actions/
  index.ts      barrel; re-exports only
  render.ts     render(wf) = renderDoc(toDoc(wf)), the call users make
  types.ts      the provider's structs and unions
  leaves.ts     expr, script, matrix, needs
  to-doc.ts     the single lowering function
  validate.ts   document-level checks
  trigger.ts    the `on:` vocabulary
```

Providers import from core, never from a sibling provider. Duplicated vocabulary across providers
is deliberate: `Cache` in GHA and `cache:` in GitLab differ in ways that only reveal themselves
after both are written, and an abstraction extracted with three examples is a refactor while one
extracted from two is a commitment.

## Invariants

These are testable and should be enforced by tests, not by review.

1. `renderDoc` is pure and deterministic. Same `Doc` in separate processes yields identical bytes,
   LF only, exactly one trailing newline.

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

| Decision                                                 | Rationale                                                                                                                                           | Cost                                                                                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Whole-file ownership                                     | Drift becomes byte equality: no CST, no differ, no comment preservation, no merge policy for foreign keys                                           | Anything hand-edited is silently destroyed; git is the only recovery                                                                  |
| Functions, no CLI                                        | Removes config discovery and TS loading from the design; orchestration is 5 lines of user code                                                      | Users need Node 24+ (type stripping) or their own TS runner, plus their own CI wiring                                                 |
| Spread as the composition unit                           | Zero new vocabulary; works on any struct at any depth                                                                                               | Duplicate ids across composed arrays are undetected, so validation must live in `toDoc`; conditional-absent keys need `omitUndefined` |
| One shared emitter                                       | Quoting and escaping is not provider-specific; three emitters would mean three bug surfaces with no test that notices                               | `Doc` stays YAML-flavoured even for JSON targets                                                                                      |
| No comments in output                                    | Comment placement is the fiddliest part of emission and gains nothing; the TS is what gets reviewed                                                 | Generated files rely on key ordering alone for readability                                                                            |
| `fromValue` value-level only                             | Decides JS-to-tree semantics exactly once, and is the only safe path for `unknown` data                                                             | Used on a whole struct it bypasses the typed layer, so unmodelled keys pass silently                                                  |
| Types hand-written, schema as oracle                     | Schemas here are loose draft-07 unions with no discriminators; generated types are unusable for a DSL                                               | Types can drift from the spec and only corpus tests will notice                                                                       |
| `yaml` (eemeli), pinned exact                            | Ordered maps, scalar styles, custom tags and a CST out of the box; hand-rolling quoting is weeks of subtle bugs                                     | Its output is part of the format contract, so upgrades are deliberate and may change emitted bytes                                    |
| Errors are exceptions, defined in core                   | `DiagnosticError` carries `{ path, message, hint }[]`; a definition that cannot lower is a program error, and the caller's script owns presentation | Callers must catch to report nicely; nothing forces them to                                                                           |
| `renderDoc` takes `{ header?: string }` and nothing else | One knob that users actually asked for; no configuration for taste that has not been needed                                                         | A second target needing more options forces a widening later                                                                          |
| GHA, then GitLab, then Bitbucket                         | GHA has the largest grammar and is best placed to stress the core                                                                                   | Bitbucket's grammar gets the least scrutiny, correctly, last                                                                          |
| `write` never creates directories                        | Thin write; the caller owns the path                                                                                                                | First run in a clean tree fails unless the directory exists                                                                           |
| No blank lines in emitted output                         | The YAML is a build artifact; the TS is what gets reviewed                                                                                          | Large files are dense; accepted, for the same reason comments were dropped                                                            |

## Testing

- **Golden emission** per fixture, next to the emitter, reviewable in diffs.
- **Schema conformance**: emitted YAML validated against the upstream schema vendored at
  `test/schemas/<provider>.json`, refreshed on demand rather than gating CI on upstream churn.
- **Determinism**: two renders in separate processes, byte-identical.
- **YAML traps**: `on:` as a key, `yes`/`no`, `1.10`, and an expression containing `: `.
- **Corpus round-trip**: a pinned set of real public configs, each reproduced by a test under
  `test/corpus/<provider>/` and asserted byte-identical. Pinned by commit so upstream changes cannot
  break the build.
- **Exhaustiveness**: any key in the corpus the DSL cannot express fails the test, unless covered
  by `raw`, in which case it is reported as coverage debt. The fraction of the corpus needing
  `raw` is the roadmap.

## Provider "done"

A provider is done when the corpus round-trips byte-identically, every corpus key is either
modelled or counted against `raw`, and the document-level validations (duplicate ids, dangling
references, cycles) run in `toDoc`. Coverage of the written spec is not the target; coverage of
real configs is, because it is measurable and the spec is not.
