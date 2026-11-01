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

### Evergreen comments

A comment describes the code as it is, not the work that produced it. State what the code does, why it does it and why not the alternative, all in the present tense. A ticket, issue, pull request, review or session closes as soon as a comment cites it, so the claim cannot be checked later and the comment decays. Cite a decision record only where that record is the durable source of the rule. Never use it as a history of how the code arrived.

Settles: What a comment may reference.

## TDD

There is a TDD skill in this repository. Given how unit testable this project is, TDD should be the default behaviour when developing. Our goal is to reach convergence with representing the DSLs of
the providers we target, tests are a natural way of measuring this progress.

Settles: How tasks should be approached.

## Typesafety

End to end typesafety is non-negotiable. Do not use casts to satisfy (but lie) to the typechecker. When writing tests create re-usable mock functions if type-safe arrangement is verbose.

`any` is never acceptable: it is unchecked by definition. `unknown` is acceptable, but only at a boundary, meaning the one function that takes untyped input and returns a valid type. Nothing downstream may see it. A cast is not a boundary; it asserts without checking. `Value` in core is the type data has once it has crossed.

Settles: How to leverage the TypeScript compiler, how to think about typesafety, and where untyped input is allowed to enter

## Duplication over premature abstraction

Two similar providers are not evidence of a shared concept; three are.

    This:     three near-identical blocks, extracted when the third arrives
    Not this: a `CacheConfig` in core after two providers happen to want one

The exception is functionality that is plainly general: a `safeParseJson` helper should not be written once per module.

Settles: the recurring "these look the same, should we factor them out". Not yet.

## Naming

Naming of functions should describe what it does: e.g. `omitUndefined` is preferable to `compact`.

Name a module-level binding whose value is invariant data in `SCREAMING_SNAKE_CASE`. Data is a literal, a template literal, a regular expression, an array, a record, a symbol, or an instance produced once by a call, such as `new Ajv(...)` or `defineRule({...})`. Keep `camelCase` when the value is a function, including an arrow function bound with `const`. A reader can then tell a shared value from a function at a glance. Leave locals, parameters, destructured bindings, type aliases, interfaces and classes alone.

    This:     const COVERAGE_DEBT: readonly Debt[] = [...]                    // invariant data
              const renderPipeline = (value: Pipeline): string => ...        // function
    Not this: const RENDER_PIPELINE = (value: Pipeline): string => ...

Keep the current name of a binding the package publishes, such as `yamlSerializer`. A convention change does not rename a consumer's import.

Settles: How to name functions and module-level constants

## Whitespace

Human readability is a top-priority for any use of whitespace. Humans scan code top to bottom and use both whitespace and indentation to skip over irrelevant details.

Preserve whitespace when authoring code and group semantically similar operations together.
