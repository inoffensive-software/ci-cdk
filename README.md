# @inoffensive/ci

A typed TypeScript DSL that compiles to CI provider configuration. You write a `ci.ts`, run the
CLI, and get committed YAML for the providers you target. No runtime dependency on this package:
it is a dev dependency that generates config, never something your pipeline imports at run time.

Status: scaffold. The package shape, tooling, and TypeScript configuration are in place; the DSL
surface and provider emitters are not written yet.

## Layout

```
src/index.ts         core primitives and the public entry point
src/vendors/         one directory per provider, e.g. src/vendors/github-actions/
tsconfig.json        all compiler options; build: src/ -> dist/, tests excluded
tsconfig.test.json   extends the above, typechecks src/ + vitest.config.ts, noEmit
```

Single package, no workspace: this repo _is_ `@inoffensive/ci`. Providers are directories inside it,
not separate packages -- they ship together, at one version, to one audience, so a package boundary
would only add build plumbing. Each provider still owns its vocabulary, types, and tests, and gets
its own subpath export:

```ts
import { defineConfig } from "@inoffensive/ci";
import { githubActions } from "@inoffensive/ci/github-actions";

export default defineConfig(githubActions(/* ... */));
```

Conventions that keep that workable:

- Core stays provider-neutral. No GitHub/GitLab-specific nouns outside `src/vendors/`.
- Providers may import from core, never from a sibling provider directory.
- One declaration site per shared type, in core. Providers do not re-declare or wrap them, or type
  identity breaks across subpaths.
- Every provider ships a golden-file test of its emitted YAML; those files double as documentation.

Tests sit next to the code they cover (`src/foo.test.ts`, golden files in `src/__snapshots__/`).
`tsconfig.json` excludes `*.test.ts` so they never reach `dist/`.

## Commands

```
pnpm install          # install deps
pnpm compile          # tsc -b, emits dist/
pnpm typecheck        # tsc -p tsconfig.test.json, includes colocated tests
pnpm test             # vitest run
pnpm test:watch       # vitest
pnpm lint             # oxlint
pnpm format           # oxfmt, writes
pnpm format:check     # oxfmt --check
pnpm check            # format:check -> compile -> typecheck -> lint -> test
```

Provider emitters assert their YAML with `expect(...).toMatchFileSnapshot("__snapshots__/<name>.yml")`
from the test file next to the emitter, so the golden files are reviewable in the diff.

## Tooling

- TypeScript 7.x, ESM only, `module`/`moduleResolution: nodenext`, strict flag set inline in
  `tsconfig.json` (see below).
- Build is `tsc` alone; no bundler. `exports` points straight at the emitted files.
- oxlint for linting (`.oxlintrc.json`), oxfmt for formatting (`.oxfmtrc.json`).
- Versioning and publishing are not wired yet: changesets plus a provenance-enabled release workflow
  are the intended path.

## TypeScript configuration

`tsconfig.json` holds every option; `tsconfig.test.json` only re-includes the test files. Notable
settings beyond `strict: true`, and what they buy:

- `noUncheckedIndexedAccess` -- `map[key]` and `arr[0]` are `T | undefined`, because index access is
  unsafe by default.
- `exactOptionalPropertyTypes` -- `{ a?: string }` rejects `{ a: undefined }`; absent and undefined
  stay distinct.
- `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch` -- subclass renames,
  missing returns, and accidental fallthrough become errors instead of silent behavior.
- `noPropertyAccessFromIndexSignature` -- `obj.foo` is banned on index signatures, forcing `obj["foo"]`
  so typos are visible.
- `noUnusedLocals` / `noUnusedParameters` -- dead code fails the build; prefix `_` to mark a
  parameter intentionally unused.
- `allowUnreachableCode: false`, `allowUnusedLabels: false`, `useUnknownInCatchVariables`,
  `strictBuiltinIteratorReturn` -- no unreachable code, no stray labels, `catch` binds `unknown`,
  iterators yield `T | undefined`.
- `verbatimModuleSyntax` -- no import elision or hidden CJS interop; type-only imports must say
  `import type`.
- `isolatedModules` / `moduleDetection: force` -- every file is an independently transpilable module.
- `noUncheckedSideEffectImports` -- a bare `import "./x"` that resolves to nothing is an error.
- `erasableSyntaxOnly` -- no `enum`, `namespace`, or parameter properties, only syntax Node can strip.
- `module`/`moduleResolution: nodenext` -- resolve exactly like Node; ESM imports need extensions.
- `skipLibCheck: false` -- dependency `.d.ts` files are typechecked too. Combined with `lib: ["esnext"]`
  this is why `@types/node` and `"types": ["node"]` are required: vitest's own types reference Node
  globals.
- `target: esnext`, `lib: ["esnext"]` -- no DOM globals leak into Node code; add `"dom"` explicitly
  if a browser target ever shows up.

If a flag genuinely does not fit, override it per-file with a nested config rather than weakening the
root one; `erasableSyntaxOnly` is the first candidate if you ever need a real `enum`.
