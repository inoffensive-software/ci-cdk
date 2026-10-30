# AGENTS.md

Working notes for agents and contributors. For why the code is shaped this way, read
`docs/architecture.md`; this file does not restate it.

## Repo map

```
src/index.ts         public entry point; re-exports core
src/core/            provider-neutral only: Doc, fromValue, render, write
src/<provider>/      one directory per provider, name == subpath export (github-actions, ...)
docs/                architecture.md, decisions/ (ADRs), providers/ (coverage)
```

`@inoffensive/ci-cdk/<provider>` ↔ `src/<provider>/` ↔ `dist/<provider>/`. Keep that 1:1.

## Commands

```
pnpm check          # fmt:check -> compile -> typecheck -> lint -> test -> fallow. Run before finishing.
pnpm compile        # tsc -b
pnpm typecheck      # tsc -p tsconfig.test.json (includes colocated tests)
pnpm test           # vitest run
pnpm lint           # oxlint
pnpm fmt            # oxfmt, writes
```

`pnpm fallow` also gates architecture: zone rules fail the build on boundary violations.
`pnpm fallow guard <files>` shows the rules that apply to a file before you edit it.

## Hard rules

- **No provider nouns in `src/core/`.** Not `Job`, not `Step`, not `Pipeline`, not even as
  interfaces. If it needs a provider name to describe, it belongs in `src/<provider>/`.

- **Providers import core, never each other.** Enforced by fallow zones; do not add an exception.

- **New directories must be zoned.** `coverage.requireAllFiles` fails the build otherwise — add the
  zone and its `allow` list in `.fallowrc.json` in the same change.

- **Barrels only at package roots.** `src/index.ts` and `src/<provider>/index.ts` re-export and
  contain nothing else. Everything inside a package uses relative deep imports.

- **Builders return structs; `toDoc` lowers and validates.** The user-facing call is the provider's
  one-line `render(wf)`, which is `renderDoc(toDoc(wf))`. `toDoc` stays exported for tests and
  explicit validation, but it is not part of the happy path. Validation of the whole document
  (duplicate ids, dangling references, cycles) lives only in `toDoc`, because it is the only place
  the whole document exists. Builders never validate and never merge.

- **Composition is spread.** Object spread and array literals over readonly structs. Do not add
  merge combinators.

- **Emitted output has no comments and no blank lines.** Both are deliberate; see the decisions
  table. Do not add formatting "improvements" — emitted formatting is a public contract, frozen by
  golden tests. Changing it is a breaking change.

- **`write` does not create directories.** Callers own their paths.

## TypeScript gotchas

- `exactOptionalPropertyTypes`: `{...base, env: cond ? x : undefined}` fails with `TS2375`. Use
  `omitUndefined` or declare `| undefined` on fields users compute conditionally.

- `noUncheckedIndexedAccess`: prefer ordered arrays over `Record<Id, T>`; records also lose the
  order the emitter needs.

- `erasableSyntaxOnly`: no enums, no parameter properties. Vocabularies are const-object plus union.

- `isolatedDeclarations`: every public export needs an explicit type. Inferred default exports fail
  with `TS9037`, inferred generic returns with `TS9013`.
  
- Value-level, not struct-level: `fromValue` on a whole struct bypasses the typed layer and lets
  unmodelled keys through silently.

## Tests

Colocated: `src/foo.test.ts`, golden files in `src/__snapshots__/`. Every provider ships golden
output for its fixtures. Assertions use `toMatchFileSnapshot`, so emitted YAML is reviewable in the
diff.

## Changing a decision

Architecture decisions live in `docs/decisions/` as numbered ADRs. They are immutable: supersede
rather than edit. If a change contradicts an ADR, say so explicitly and add a new one.
