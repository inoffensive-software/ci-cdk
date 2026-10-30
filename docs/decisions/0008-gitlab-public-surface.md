# 0008: the GitLab provider's public surface

**Status:** Accepted

## Context

The second provider reaches the same question ADR 0003 answered for GitHub Actions: how much of a
provider directory is importable. ADR 0003 settled that `render(workflow, options)` is the primary
seam and `toDoc(workflow)` the secondary one, because a byte diff cannot say which stage chose a
shape. Spec 0004 asks whether a second provider follows that surface or shapes its own.

GitLab also raises a question no provider has answered yet: whether a provider must ship leaf
constructors. GitHub Actions exports `expr`, `script`, `matrix` and `needs` because its expressions
need a style of their own. GitLab's `${VAR}` interpolation is plain text, and `!reference` is out of
scope for this slice, so nothing in the modelled vocabulary needs to carry a style.

## Decision

`@inoffensive/ci-cdk/gitlab-ci` exports exactly four values and three types:

- `render(pipeline, options)`: lowering plus the existing emitter, forwarding core's `{ header }`
  only.
- `toDoc(pipeline)`: the ordered `Doc`, public for the same reason ADR 0003 records.
- `pipeline` and `job`: near-identity builders.
- the types `Pipeline`, `Job` and `Script`.

Nothing else in `src/gitlab-ci/` is imported by a consumer: `validate` and the lowering helpers stay
internal, and `toDoc` remains the only entry point that validates and the only one that throws.

The provider exports **no leaves**. A field that accepts an expression is typed with core's `Text`,
so a leaf produced by any provider still lowers correctly through `fromValue`, but GitLab contributes
no constructor of its own. If `!reference` is modelled later, that is a widening recorded as a
successor to this ADR.

This record follows ADR 0003 rather than revisiting it; it supersedes nothing.

## Consequences

- A consumer learns one two-function surface and applies it to both providers.
- The barrel grows by four exports and no lifecycle: a builder, a lowering function, a renderer and
  the struct types.
- Because no leaf exists, a non-plain scalar can only enter a GitLab document through a leaf built by
  another provider or by core. That is deliberate: style is a decision someone made, and this slice
  makes none.
- The absence of leaves keeps `Script` as `Text | readonly Text[]`, so composing commands stays
  array concat rather than a builder call.

## Alternatives

- **Export only `render`.** Rejected: it contradicts ADR 0003 and removes the seam spec 0004 names
  for the one structural test of the jobs array to map lowering.
- **Export a `script()` leaf for multi-line commands.** Rejected: real configs write `script:` as
  strings or sequences, and a leaf would infer a style the format does not need, changing the parsed
  value by adding a trailing newline.
- **Export `validate`.** Rejected: it is an implementation step of `toDoc`, and two ways to check a
  document would let a caller believe a pipeline is valid without the lowering having run.
