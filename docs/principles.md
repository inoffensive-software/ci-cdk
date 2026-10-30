# Principles

How code is written here, as opposed to how the system is shaped (`docs/architecture.md`) or why a
specific choice was made (`docs/decisions/`).

Precedence, so a conflict has an answer: a decision record wins for the case it covers; a principle
is the default you should assume when nothing more specific exists; `AGENTS.md` only operationalises
and points at both.

Two rules keep this file worth reading. If a principle can be mechanised (lint rule, compiler flag,
fallow zone, test), mechanise it and cut the prose back to the judgement the tool cannot make. If
nobody would dispute it, it is decoration and should be deleted. `Whitespace` below is the current
example: the spacing rule is enforced by `anti-slop/require-readable-spacing` and oxfmt, so only the
part about grouping belongs here.

## Source code comments

The general principle for source code comments should be:

> Never tell me what, sometimes tell me why, always tell me why not

Never use em dashes or stretched metaphors. Spare me the prose and get to the point. Apply ASD-STE100 as the style guide.

Further context can be found here: https://eddie.codes/posts/source-code-comments/

Settles: How and whether something should be documented as comments

## TDD

There is a TDD skill in this repository. Given how unit testable this project is, TDD should be the default behaviour when developing. Our goal is to reach convergence with representing the DSLs of
the providers we target, tests are a natural way of measuring this progress.

Settles: How tasks should be approached.

## Typesafety

End to end typesafety is non-negotiable. Do not use casts to satisfy (but lie) to the typechecker. When writing tests create re-usable mock functions if type-safe arrangement is verbose.

`any` is never acceptable: it is unchecked by definition. `unknown` is acceptable, but only at a boundary, meaning the one function that takes untyped input and returns a valid type. Nothing downstream may see it. A cast is not a boundary; it asserts without checking. `Value` in core is the type data has once it has crossed.

Settles: How to leverage the Typescript compiler, how to think about typesafety, and where untyped input is allowed to enter

## Not an ORM

Providers keep their own vocabulary, warts and types. No shared `Job`, `Step` or `Pipeline`, not even
as an interface.

    This:     github-actions/job.ts and gitlab-ci/job.ts, different shapes
    Not this: core/job.ts with optional fields and a `provider` discriminator

Settles: whether a new field goes in a provider type or a shared one. It goes in the provider.

## Composition is code

Shared pipeline logic is a function returning a struct, imported and spread. Never a config-level
link.

    This:     const withCache = (j: Job): Job => ({ ...j, steps: [cacheStep, ...j.steps] })
    Not this: an anchor, an include, a !reference chain, or a template registry

Settles: every "how do I share this between two pipelines" question.

## Duplication over premature abstraction

Two similar providers are not evidence of a shared concept; three are.

    This:     three near-identical blocks, extracted when the third arrives
    Not this: a `CacheConfig` in core after two providers happen to want one

The only exception to this is painfully obvious shared functionality. For example a `safeParseJson` function should not be repeated in every module - it is general in nature and ripe for re-use

Settles: the recurring "these look the same, should we factor them out". Not yet.

## Naming

Naming of functions should describe what it does: e.g. `omitUndefined` is preferable to `compact`.

Settles: How to name functions

## Whitespace

Human readability is a top-priority for any use of whitespace. Humans scan code top to bottom and use both whitespace and indentation to skip over irrelevant details.

Preserve whitespace when authoring code and group semantically similar operations together.
