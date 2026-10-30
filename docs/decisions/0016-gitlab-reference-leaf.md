# 0016: the GitLab `!reference` leaf

**Status:** Accepted

**Supersedes:** the sentence "The provider exports **no leaves**" in ADR 0008, and its promise that a
`!reference` leaf would be a widening recorded as a successor, to the extent of the one leaf below.
Nothing else in ADR 0008 changes.

## Context

GitLab writes a cross-file reference as YAML-tagged data:

```yaml
script:
  - !reference [.setup, script]
```

The tag is part of the value, not part of the text. A `Text` string therefore cannot carry it: writing
`"!reference [.setup, script]"` emits a quoted string that GitLab reads as a command, and any escape
that leaves the tag unquoted stops being a string in the tree at all. Lowering could only produce the
shape by inventing a tag from the text's spelling, which is exactly the inference ADR 0008 refused when
it declined a GitLab `script()` leaf.

ADR 0008 recorded the provider as exporting no leaves and named `!reference` as the case that would
reopen the question. Spec 0006 keeps the tag out of the corpus instead of modelling it: the pinned
`labkit` configuration writes resolved arrays, so reproducing it as data never exercises a tag and the
exhaustiveness gate has no row for one. The leaf is therefore a surface decision, not a vocabulary one:
nothing in `docs/`'s modelled key set gains a field.

Core already expresses the shape. `tagged(tag, seq([...]))` is a first-class `Doc`, the serializer
already emits a tag on a sequence node, and `fromValue` already lowers a `LeafNode` wherever `Text` or
`Scalar` is accepted. No core change is needed, and none is made.

## Decision

`@inoffensive/ci-cdk/gitlab-ci` exports one new value, `ref(segments)`, from `src/gitlab-ci/leaves.ts`:

- `ref(segments: readonly string[]): LeafNode` returns a core `LeafNode` whose `DOC` method yields
  `tagged("!reference", seq(segments.map(fromValue)))`. `toString` exists for debugging only; core
  never calls it.
- The segments are author text. They are lowered by `fromValue` like any other string, so quoting and
  canonicalisation stay in one place, but they are never resolved, looked up or validated. A path that
  names nothing renders exactly as a path that names something.
- Because the return type is core's `LeafNode`, `ref` composes wherever `Text` is accepted — `script`,
  `before_script`, `after_script`, `image`, a `Text` inside a rule or artifact — and wherever `Scalar`
  is accepted, including `variables` values. It also sits inside a script array beside strings.
- The emitted bytes are a tagged block sequence, pinned by a golden. The `yaml` serializer is
  configured for block sequences and the format contract forbids non-empty flow collections, so the
  flow form GitLab's documentation shows is not what this package emits. Both forms parse to the same
  tagged sequence; the package pins the one its emitter produces rather than a guessed spelling.
- The barrel gains exactly this export. `render`, `toDoc`, `pipeline`, `job` and the types are
  unchanged, and core is untouched.

## Consequences

- The provider surface widens by one function. ADR 0008's "no leaves" holds for every other scalar: a
  GitLab expression is still plain text, and `Script` is still `Text | readonly Text[]`.
- The tag survives lowering and emission, and parses back as `!reference` on a sequence. A consumer can
  round-trip a reference rather than hand-write it through `raw`.
- A reference is data, never a link. Renaming the referenced template, deleting its file, or pointing
  at a key that does not exist is not a diagnostic; it is a pipeline failure at GitLab's runtime, as it
  is for `include`, `extends` and cross-file job references.
- No emitted byte changes for an existing pipeline. Every golden and corpus entry passes untouched,
  because no field's lowering consults the new leaf.
- The leaf does not appear in the coverage ledger, the modelled-path inventory or the schema gate. It
  is a value constructor, not a keyword, and adding it neither closes a vocabulary gap nor opens one.
- `toString` is debugging only. No downstream decision reads it, so changing its spelling is not a
  format change.

## Alternatives

- **Emit a tagged scalar.** Rejected: `!reference` names a sequence of path segments. A tagged scalar
  would carry one string, and GitLab would parse a different data shape than it documents.
- **Let the author write the tag through `raw`.** Rejected: `raw` is untyped and unvalidated, and its
  values are plain data with no way to spell a tag. Using it here would also put the reference outside
  the typed `script` field and the order guarantees the job struct provides.
- **Add a core node kind or a core `ref` constructor.** Rejected: the tag is a provider's YAML
  vocabulary, and `tagged` already expresses it. A core constructor would put a GitLab noun under
  `src/core/`, which the provider-blindness rule forbids.
- **Resolve the path and inline the referenced content.** Rejected: it would need the other file, which
  is an architectural non-goal, and it would change the document from a reference into a copy.
- **Infer the tag from a string that spells `!reference`.** Rejected: the same inference ADR 0008
  refused. Whether a string is a command or a reference is the author's decision, so it must be a
  constructor call.
