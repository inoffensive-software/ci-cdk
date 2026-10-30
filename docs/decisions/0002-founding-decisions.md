# 0002: Founding decisions

**Status:** Accepted

## Context

These were settled before any code existed, in one pass, to stop each of them being re-litigated by
the next person who finds them surprising. Each has a numbered heading, so a later record can
supersede exactly one without marking the whole file dead. This file is the "why not X" record; the
decisions table in `docs/architecture.md` is the policy summary and points here.

## D1: Whole-file ownership

A generated file is owned entirely by one definition and rewritten wholesale. No partial edits, no
managed regions, no preserved hand-edits.

Why: it collapses drift checking to byte equality. No CST, no structural differ, no comment
preservation, no policy for keys someone added by hand. Those are the parts of this kind of tool that
rot first.

Cost: anything hand-edited is destroyed silently, and git is the only recovery.

Rejected: managed-region markers. They are how these tools decay, because edits outside the markers
are invisible to the tool and reviewers cannot tell which parts are generated.

## D2: Functions, no CLI

The package exports functions. Generating is a script the consumer writes and runs with
`node ci/github.ts`.

Why: removing the CLI removes config discovery, TypeScript loading and argv parsing from the design.
Node 24 strips types, so no runner is needed either. Orchestration is a handful of lines.

Cost: consumers own their CI wiring, and the supported runtime is Node 24+.

Rejected: a CLI with a provider registry. It exists to solve discovery, and there is nothing to
discover when the consumer's script already imports the provider it wants.

## D3: One emitter, chosen by the provider

`Doc` is a YAML superset and there is exactly one YAML serializer, shared by every provider. A
provider selects a serializer; it never supplies one.

Why: quoting, escaping and tag emission are not provider-specific. Three implementations would mean
three bug surfaces, a fix in one leaving the same bug live in two others, and no test that notices.

Cost: `Doc` stays YAML-flavoured even for a JSON target, and a TOML provider would need a shaping
pass rather than a clean mapping.

Rejected: vendor-owned serialization. The strongest case for it, GitHub needing `on` unquoted, is a
lowering decision about scalar style, not a serialization one.

## D4: Spread is the composition unit

Shared pipeline logic is a function returning a struct, imported and spread at the call site.

Why: zero new vocabulary, works at any depth, and the composed result is a plain value that cannot
hide state. It is also what makes the code, rather than a YAML link, the thing being shared, so two
pipelines built from one function emit identical bytes.

Cost: duplicate ids across composed arrays are undetected by the type system, so uniqueness must be
validated at lowering; conditional-absent keys need `omitUndefined` under
`exactOptionalPropertyTypes`.

Rejected: `patch`/`merge`/`keyedBy` combinators. They re-express spread, and the one thing they add
(duplicate detection) belongs in `toDoc`, which is the only place that sees the whole document.

## D5: No comments and no blank lines in output

The emitted YAML contains one comment, the header line, and no blank lines.

Why: comment placement is the fiddliest part of emission and buys nothing, because the TypeScript is
what gets reviewed and the YAML is a build artifact. Blank lines are the same argument.

Cost: large generated files are dense, and the format contract has fewer levers to express taste.

Rejected: emitting doc comments from the DSL. It doubles the surface that must be formatted
deterministically for a file nobody reads.

## D6: Providers stay independent

No provider-neutral pipeline model. No shared `Job`, `Step` or `Pipeline`, not even as an interface.

Why: a shared type forces one of three outcomes: a union of provider variants, all-optional fields, or
a lowest common denominator. All three are the ORM this project exists not to be. Duplicated
vocabulary is cheaper than an abstraction that cannot be removed.

Cost: three separate vocabularies, and a genuinely shared concept is written three times until a
third example proves it is general.

Rejected: harmonising on a common IR. It would have to model every provider's warts anyway, badly.
