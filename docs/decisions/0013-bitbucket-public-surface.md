# 0013: the Bitbucket Pipelines provider's public surface

**Status:** Accepted

## Context

The third provider reaches the same question ADR 0003 answered for GitHub Actions and ADR 0008
answered for GitLab: how much of a provider directory is importable. ADR 0003 settles that
`render(config, options)` is the primary seam and `toDoc(config)` the secondary one, because a byte
diff cannot say which stage chose a shape. Spec 0007 asks whether a third provider with a different
document root follows that surface or shapes its own.

Bitbucket raises one question the first two did not: what the document type is called. "Pipeline"
is the file, but it is also each triggered entry inside it, so a `Pipeline` type would name both a
whole document and one of its parts. The vocabulary also introduces a pipe, which is a struct inside
a script sequence rather than a scalar leaf.

This record covers the tracer slice. It names only the exports that exist now, and is extended as
the item builders land so it always describes the surface that ships.

## Decision

`@inoffensive/ci-cdk/bitbucket-pipelines` exports exactly five values and eight types:

- `render(config, options)`: lowering plus the existing emitter, forwarding core's `{ header }` only.
- `toDoc(config)`: the ordered `Doc`, public for the same reason ADR 0003 records.
- `pipelineConfig`, `step` and `pipe`: near-identity builders. `pipelineConfig` and `pipe` return
  their input; `step` wraps a step body in the singular `step:` item key, which is the type that
  keeps `step:` and `steps:` distinct.
- the types `PipelineConfig`, `Pipelines`, `SelectorPipeline`, `PipelineItem`, `StepItem`, `Step`,
  `ScriptItem` and `Pipe`.

Nothing else in `src/bitbucket-pipelines/` is imported by a consumer: `validate` and the lowering
helpers stay internal, and `toDoc` remains the only entry point that validates and the only one that
throws.

The document type is `PipelineConfig`, not `Pipeline`, because Bitbucket uses "pipeline" for each
triggered entry as well as for the file. A struct that names a whole file `Pipeline` would collide
with the item vocabulary the next tickets add.

The provider exports **no leaves**. A field that accepts an expression is typed with core's `Text`,
so a leaf produced by any provider still lowers correctly through `fromValue`, but Bitbucket
contributes no constructor of its own. `${VAR}` is plain text, and a pipe is a struct rather than a
styled scalar.

This record follows ADR 0003 and ADR 0008 rather than revisiting them; it supersedes nothing.

## Consequences

- A consumer learns one two-function surface and applies it to all three providers.
- The barrel grows by five exports and no lifecycle: three builders, a lowering function, a renderer
  and the struct types.
- Because no leaf exists, a non-plain scalar can only enter a Bitbucket document through a leaf built
  by another provider or by core. That is deliberate: style is a decision someone made, and this
  slice makes none for `${VAR}`.
- `step` is the one builder that is not literally identity: it adds the item wrapper. That wrapper is
  the point, because the singular `step:` key is a type rather than a naming convention.

## Alternatives

- **Export only `render`.** Rejected: it contradicts ADR 0003 and removes the seam the structural
  `toDoc` tests use.
- **Name the document `Pipeline`.** Rejected: the same word names a triggered entry, and the item
  builders would then have to disambiguate in prose what the types should say.
- **Export a `script` or `expr` leaf.** Rejected: Bitbucket's interpolation is plain text and its
  script is always a sequence, so a leaf would only invent a style the format does not need.
- **Export `validate`.** Rejected: it is an implementation step of `toDoc`, and two ways to check a
  document would let a caller believe a configuration is valid without the lowering having run.
