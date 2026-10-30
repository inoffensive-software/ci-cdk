# Spec 0001: Core `Doc`, the boundary parser, and the YAML emitter

Status: ready-for-agent
Covers: build order steps 1 and 2 in `docs/architecture.md`.
Supersedes: nothing. Respects ADR 0002 (D1-D6) and ADR 0001.

## Problem Statement

The package is scaffolded but has no implementation. `src/` contains one placeholder export and a
test-harness check, so every later decision in `docs/architecture.md` is currently an assertion about
code that does not exist. A provider cannot be written, a golden cannot be pinned, and the package's
central claim (typed structs compile to byte-stable YAML) cannot be tested at any seam.

For a consumer, this means there is nothing to import: no `write`, no `renderDoc`, no `Doc`. For a
provider author, there is no translation layer to lower into, so the GitHub Actions work in later
steps has no foundation and would end up inventing one.

## Solution

Build the core data layer and the single YAML emitter, in that order, as one deliverable:

- `Doc`: an ordered, style-annotated tree that is a YAML superset (maps as ordered key/value entry
  arrays, sequences, styled scalars, tags).
- `Value`: the precise recursive type data has once it has crossed the boundary.
- `fromValue`: the one boundary parser, `unknown` in, `Doc` out, with structured diagnostics and no
  style inference from content.
- `renderDoc`: the provider-blind emitter, `Doc` in, text out, with the header knob and nothing else.

A consumer of this slice can turn plain JavaScript data into YAML text with a fixed, deterministic
format. A provider author can lower typed structs into `Doc` and get correct quoting, key order and
shell blocks for free. No provider vocabulary exists yet and none is needed to validate the slice.

## User Stories

1. As a library consumer, I want a `Doc` type built from ordered entries rather than records, so that
   emitted key order is the order I wrote and never sorted.
2. As a library consumer, I want `renderDoc` to take a `Doc` and return text, so that I can inspect
   or write output without a provider being involved.
3. As a library consumer, I want a default header line on every rendered document, so that reviewers
   can see the file is generated without me remembering to add a comment.
4. As a library consumer, I want to pass `{ header: "" }` to remove the header, so that a document can
   be emitted without that one permitted comment.
5. As a library consumer, I want the default header to contain no timestamp and no package version (unless overridden by a user to do so), so
   that regenerating a file never produces a spurious diff.

6. As a library consumer, I want `fromValue` to accept plain nested JavaScript data (objects, arrays,
   strings, numbers, booleans, null), so that hand-authored data can be emitted without a typed
   struct.

7. As a library consumer, I want `fromValue` to preserve array order and object insertion order, so
   that my source order survives into the file.

8. As a library consumer, I want a string that looks like a number or a boolean to be quoted on
   output, so that `"1.10"` does not silently become the number `1.1` for the next reader.

9. As a library consumer, I want the key `on` emitted unquoted, so that GitHub workflow files read
   the way GitHub documents them.

10. As a library consumer, I want a shell script to be emitted as a literal block scalar, so that
    multi-line `run` text keeps its newlines and does not need escaping.

11. As a library consumer, I want strings containing `: ` or ` #` to be quoted automatically, so that
    a value I wrote as a plain string cannot produce invalid YAML.

12. As a library consumer, I want long plain strings to stay on one line rather than wrap at column
    80, so that a `run` command's emitted bytes do not depend on where column 80 falls.

13. As a library consumer, I want two-space indentation and no blank lines in the output, so that
    generated files are predictable and diff cleanly.

14. As a library consumer, I want exactly one trailing newline and LF line endings, so that the file
    matches what git and editors expect on every platform.

15. As a library consumer, I want output with no comments other than the header, so that I never have
    to reconcile generated prose with the source.

16. As a library consumer, I want an empty map or empty sequence to emit as `{}` or `[]`, so that
    "no entries" is expressible at all, given block style has no empty form.

17. As a library consumer, I want a clear path-addressed error when my data contains `undefined`, a
    function, a `Date`, a `Map`, or a cycle, so that I can find the offending key instead of reading a
    stack trace.

18. As a library consumer, I want errors raised as one exception type carrying a list of diagnostics
    with `path`, `message` and an optional `hint`, so that my script can present them however it
    likes.

19. As a library consumer, I want diagnostic paths written in a stable notation, so that messages are
    greppable and testable.

20. As a library consumer, I want `undefined` to be rejected rather than silently dropped, so that a
    conditionally absent key is forced through an explicit `omitUndefined` call at the call site.

21. As a library consumer, I want `NaN` and `Infinity` rejected, so that I do not accidentally rely
    on a YAML float spelling that differs between readers.

22. As a library consumer, I want `null` emitted as YAML null, so that an intentional empty value is
    distinguishable from an absent one.

23. As a provider author, I want a leaf to carry its own `Doc`, so that a scalar's style is decided by
    the constructor that produced it and never guessed from its content.
24. As a provider author, I want `fromValue` to recurse into anything carrying the `DOC` symbol, so
    that a provider leaf can be placed inside plain nested data and still emit correctly.
25. As a provider author, I want tags as a property of a node, so that GitLab's `!reference` and
    similar constructs can be expressed without a new node kind.
26. As a provider author, I want `renderDoc` to be provider-blind, so that I can rely on one emitter
    and one formatting contract for every provider.
27. As a provider author, I want the serializer behind a `Serializer` interface with one YAML
    implementation, so that a future JSON or TOML target is an addition rather than a fork.
28. As a reviewer, I want the emitted format pinned by golden files, so that any change to bytes
    shows up in review as a diff rather than as a surprise in a consumer's repository.
29. As a reviewer, I want a test asserting that no provider name appears in core sources, so that the
    provider-neutral boundary survives the first provider landing.
30. As a contributor, I want the format decisions (indent, sequence indentation, empty collections,
    header, trailing newline) written down in one place, so that I do not re-litigate them per module.
31. As a contributor, I want every export to carry an explicit type, so that `isolatedDeclarations`
    passes and the published `.d.ts` stays readable.
32. As a contributor, I want the boundary parser to be the only place `unknown` appears, so that
    typesafety past the boundary is structural rather than asserted.
33. As a contributor, I want the determinism test to exercise fresh module instances, so that
    accidental module-level state is caught before it reaches a consumer.
34. As a contributor, I want the public core barrel to be the only import path I test through, so that
    a refactor inside core does not force test rewrites.

## Implementation Decisions

### Modules

Seven modules in core, plus the existing package entry point:

- **doc**: the `Doc` union, the constructors (`map`, `seq`, `scalar`, `block`, `tagged`), the `DOC`
  unique symbol and the `LeafNode` interface.
- **value**: the `Value` recursive type. Type-only, no runtime code.
- **from-value**: `fromValue`, the boundary parser.
- **errors**: `Diagnostic`, `DiagnosticError`, `fail`, `formatDiagnostics`.
- **serialize**: the `Serializer` interface and the YAML implementation.
- **render-doc**: `renderDoc` and `RenderOptions`, delegating to the YAML serializer.
- **core barrel**: re-exports the public surface above. The package entry point re-exports the barrel
  and keeps no logic of its own.

The existing `identity` placeholder export is deleted, and the harness test is replaced by real tests
as they land.

### `Doc` shape

Three node kinds, each a readonly object with a `kind` discriminant: `map`, `seq`, `scalar`. A tag is
an optional `tag: string` field on any node rather than a wrapper kind, so the serializer has three
cases and no nesting rules to reason about. `tagged(tag, node)` returns a node of the same kind with
the tag set; it does not introduce a fourth shape.

Settled constructor signatures (interfaces, not bodies):

```
type ScalarStyle = "plain" | "single" | "double" | "literal" | "folded"
type DocEntry = { readonly key: string; readonly value: Doc }
type DocMap = { readonly kind: "map"; readonly entries: readonly DocEntry[]; readonly tag?: string }
type DocSeq = { readonly kind: "seq"; readonly items: readonly Doc[]; readonly tag?: string }
type DocScalar = { readonly kind: "scalar"; readonly value: string; readonly style: ScalarStyle; readonly tag?: string }
type Doc = DocMap | DocSeq | DocScalar

map(entries: readonly DocEntry[]): DocMap
seq(items: readonly Doc[]): DocSeq
scalar(value: string, options?: { style?: ScalarStyle; tag?: string }): DocScalar
block(text: string): DocScalar          // literal style
tagged(tag: string, node: Doc): Doc
```

`scalar` takes a string, not `string | number`, because a number that becomes text has already lost
the information the emitter would need. Numbers enter the tree only through `fromValue`, which
serialises them before constructing the node.

`block` is a named constructor over `scalar(..., { style: "literal" })` because "this is shell text"
is the decision being made, and the style name is an emitter detail.

### `Value` shape

A recursive readonly union of `string | number | boolean | null | readonly Value[] | { readonly [key:
string]: Value }`. It exists so callers can type their input data precisely; our own structs are never
assignable to it, which is intentional and recorded in the architecture decisions table.

### `fromValue` semantics

- Accepted leaves: `string`, finite `number`, `boolean`, `null`.
- Accepted containers: arrays, and plain objects (prototype is `Object.prototype` or `null`).
- Anything carrying `DOC` is lowered by calling it, before any other classification. This is what lets
  a provider leaf sit at any depth.
- Object keys come from own enumerable string keys, in insertion order. Symbol keys are ignored.
- Rejected, each as a diagnostic at its path: `undefined`, functions, symbols, bigint, `NaN`,
  `Infinity`, `-Infinity`, `Date`, `Map`, `Set`, class instances, and any object with a non-plain
  prototype.
- Cycles are detected by tracking the ancestor chain and rejected with a diagnostic naming the
  repeated path. A value that appears twice without being an ancestor is not a cycle and must be
  emitted twice.
- Root may be any value; restricting a document root to a map is the provider's job, not the parser's.
- Numbers are serialised with `String(n)`, so `1.10` becomes `1.1` and `1e21` keeps exponent form. No
  rounding, no padding, no locale.
- `fromValue` never infers scalar style. Every scalar it creates is `plain`; quoting at emission time
  is the serializer's job, driven by content safety, not by the value's type.

### Diagnostic paths

Root is `$`. A property is `.name` when the name is a plain identifier, otherwise `["runs-on"]`.
An index is `[0]`. Example: `$.jobs["build"].steps[2].run`. A map entry that fails because its value
is `undefined` reports the key's path, not the parent's.

### Errors

`Diagnostic` is `{ path: string; message: string; hint?: string }`. `DiagnosticError` extends `Error`
and carries `readonly diagnostics: readonly Diagnostic[]`; its `message` is the formatted diagnostics.
`fail(...diagnostics): never` throws it. `formatDiagnostics` renders one diagnostic per line as
`path: message` plus `hint: ...` when present. `fromValue` throws `DiagnosticError` with every problem
it can find in one pass rather than stopping at the first; entry-level failures are collected,
container-level ones (cycle) abort that branch.

### `renderDoc` and formatting contract

`renderDoc(doc: Doc, options?: RenderOptions): string`, where `RenderOptions` is `{ header?: string }`
and nothing else. The serializer is selected by `renderDoc` and is not a parameter.

- Default header is exactly `Generated by @inoffensive/ci-cdk. Do not edit.` and is emitted as
  `# Generated by @inoffensive/ci-cdk. Do not edit.` with no blank line after it.
- `header: ""` emits no header at all. A header containing a newline is a diagnostic, because the
  contract permits exactly one comment line.
- Two-space indent, block style, `lineWidth: 0` so nothing wraps.
- Sequences are indented under their key (`indentSeq` behaviour), matching the shape GitHub's own
  examples use. A sequence at document root starts at column 0.
- Empty map is `{}`, empty seq is `[]`. Flow style appears only for the empty case, because block
  style cannot express zero entries.
- Key order is entry order, never sorted. Duplicate keys inside one map are a diagnostic, not
  last-wins.
- Output is LF only and ends with exactly one newline, including when the document is empty.
- Shell text is whatever the `Doc` says it is. `fromValue` never produces a literal block, so plain
  data is never turned into one by surprise.

### The serializer

`Serializer` is an interface with one member rendering a `Doc` to text under the same options.
The YAML implementation builds a yaml `Document` from the tree, attaches the header as
`commentBefore` on the root, and stringifies with the pinned options. `renderDoc` normalises the
result: strip trailing whitespace on each line, collapse trailing newlines to one, and fail if the
serializer produced a blank line or a `---` marker, since both indicate the pinned options were
bypassed.

### Dependency

`yaml` is added at exact version `2.9.1`, with no range, as a runtime dependency. No other runtime
dependency is added. The version is pinned because the library's output is part of the format
contract and an upgrade may change bytes.

### House rules that bite here

- `exactOptionalPropertyTypes`: optional `tag` and `style` fields are set via `omitUndefined` or
  omitted at construction, never assigned `undefined`.
- `erasableSyntaxOnly`: no enums; `kind` and `style` are string-literal unions.
- `isolatedDeclarations`: explicit return types on every exported function and explicit types on
  every exported constant.
- `unknown` appears only as the parameter type of `fromValue`. `any` appears nowhere.
- Core imports nothing from the project; the fallow `core` zone keeps `allow: []`.

## Testing Decisions

**One seam: the core barrel.** Every test imports from the core barrel and asserts on
`renderDoc(fromValue(input))` or on the `DiagnosticError` that call throws. No test reaches into a
constructor, a node shape or a serializer option. This is the highest seam available in this slice and
the only one that will survive refactors inside core.

A good test here asserts emitted text as bytes: the whole document, not a line, and not a substring
unless the assertion is specifically about quoting. Tests must not assert on internal node shapes;
`Doc` structure is an implementation detail of the emitter, and pinning it would make the ordered-entry
decision unchangeable for the wrong reason.

**Golden files.** Emission is pinned with `toMatchFileSnapshot`, one golden per fixture, colocated
with the test. Generated names are meaningful (`map-trap`, `number-trap`, `block-script`,
`header-off`). A golden is regenerated only as a deliberate format change.

**Coverage of the contract**, one test per rule where a rule can break independently:

- Key order preserved through nesting, and duplicate keys rejected.
- `on` unquoted; `yes`/`no` strings quoted; `"1.10"` quoted while `1.1` is not.
- A string containing `: ` and a string containing ` #` quoted.
- A string over 100 characters emitted on one line.
- Literal block for `block()` text with trailing and internal newlines.
- Tag survives on a scalar.
- Empty map and empty seq, and a document whose root is empty.
- Header default, header removed, header with a newline rejected.
- `null`, `true`, `false`, integer and float emission.
- Diagnostics: `undefined` in an object, function in an array, `Date`, `Map`, class instance, cycle,
  `NaN`; each asserts the path string and that one throw carries multiple diagnostics.

**Determinism.** Render the same fixture twice through two fresh module graphs (dynamic import with a
distinct query suffix, so module-level state cannot be shared) and assert byte equality, LF-only and
exactly one trailing newline.

**Provider-blindness.** A source-scanning test walks core sources and fails if any provider name
(`github`, `gitlab`, `bitbucket`, `actions`) appears, case-insensitive. This is the test the
architecture promises, and it must land before the first provider so it is never weakened later.

**Prior art.** The harness test already demonstrates `toMatchFileSnapshot` and the colocated
`__snapshots__` convention. The golden fixtures in this slice follow that shape; the corpus tests in
`test/corpus/` follow the same byte-equality idea at a larger scale and reuse these golden helpers
when they land.

## Out of Scope

- GitHub Actions vocabulary, `toDoc`, validation, `render`, and the whole workflow golden (steps 4-7).
- `io.write` and `omitUndefined` (step 3), except that `omitUndefined` may be used privately if a
  construction site needs it; it is not exported in this slice.
- A JSON or TOML serializer. The `Serializer` interface allows one; no second implementation is
  written.
- The `Text` alias and any provider leaf constructors (`expr`, `script`, `matrix`, `needs`). Core
  provides `DOC` and `LeafNode` only.
- Schema conformance tests, the corpus, and the vendored schemas.
- Comments in output beyond the header, blank lines, flow style for non-empty collections, and any
  formatting option other than `header`.
- Partial document editing, multi-file emission, cross-file reference resolution, and a CLI. These are
  permanent non-goals, restated only so they are not designed for here.

## Further Notes

- Sequence indentation and empty-collection spelling are the two choices in the emitted format that
  `docs/architecture.md` does not pin. Both are decided above and must be captured in a golden before
  any provider code exists, because changing them later is a breaking change.
- `yaml` is currently not installed. Adding it is the first ticket, and it must be exact-pinned;
  `pnpm check` enforces the lockfile and fallow reports unused dependencies, so a dependency added
  before its first import will fail the check. Land the dependency in the same change as the first
  serializer import.
- The repo has no issue tracker configured and no git remote, so this spec lives in `docs/specs/` and
  its tickets in `docs/tickets/`. The `ready-for-agent` status above stands in for the triage label.
- Replacing the harness test removes the only current proof that `pnpm test` and the compile pipeline
  work. The first real test must land in the same change, not after.
