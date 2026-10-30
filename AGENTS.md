# AGENTS.md

Operational notes. Shape and rationale live in `docs/architecture.md`; one home per fact, so this file
does not restate them.

## Repo map

```
src/index.ts     entry point; re-exports core
src/core/        provider-neutral: Doc, Value, fromValue, renderDoc, write, errors, omitUndefined
src/<provider>/  one provider per directory; name == subpath export
docs/            architecture.md, principles.md, decisions/, references/, providers/
test/corpus/     pinned real configs (rules in test/corpus/README.md)
.agents/skills/  project-local agent skills
```

`@inoffensive/ci-cdk/<provider>` ↔ `src/<provider>/` ↔ `dist/<provider>/`.

## When about to...

| do this                    | do this first                                                          |
| -------------------------- | ---------------------------------------------------------------------- |
| finish any change          | `pnpm check`                                                           |
| change formatting only     | `pnpm fmt`, then `pnpm check`                                          |
| add a directory under src/ | add a zone and its `allow` list in `.fallowrc.json`, then `pnpm check` |
| add a dependency           | pin it exact, no range, then `pnpm check`                              |
| change emitted output      | regenerate goldens; treat the format change as breaking                |
| add a boundary parser      | per-file override in `.oxlintrc.json`; never weaken a rule globally    |
| change a settled decision  | add an ADR naming the anchor it supersedes                             |
| touch `src/core/`          | read `docs/architecture.md` first                                      |
| add a corpus entry         | follow `test/corpus/README.md`; one fixture per shape                  |

## Non-negotiables

- No provider nouns in `src/core/`, not even as interfaces.
- Providers import core, never each other. Fallow zones enforce it; no exceptions.
- Builders return structs; only `toDoc` validates; `render(wf)` is the happy path.
- Emitted output: header line only, no blank lines, format frozen by goldens.
- `unknown` only in a boundary parser; `any` never.

## Enforced by tooling, do not re-implement

fallow zones, oxlint anti-slop, `isolatedDeclarations`, golden tests. `pnpm fallow guard <files>` shows
the rules that apply before an edit.

## TypeScript gotchas

- `exactOptionalPropertyTypes`: `{...base, env: cond ? x : undefined}` fails TS2375; use `omitUndefined`.
- `noUncheckedIndexedAccess`: prefer ordered arrays over `Record<Id, T>`; records lose order too.
- `erasableSyntaxOnly`: no enums, no parameter properties; const-object plus union.
- `isolatedDeclarations`: explicit type on every export. TS9037 for an inferred default export,
  TS9013 for an inferred generic return.

## Tests

Colocated `src/foo.test.ts`, goldens in `src/__snapshots__/`, corpus tests in `test/corpus/<provider>/`.
Assertions use `toMatchFileSnapshot`.
