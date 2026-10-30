# @inoffensive/ci-cdk

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
.fallowrc.json       fallow config (JSONC); entry points detected from package.json
```

Single package, no workspace: this repo _is_ `@inoffensive/ci-cdk`. Providers are directories inside it,
not separate packages -- they ship together, at one version, to one audience, so a package boundary
would only add build plumbing. Each provider still owns its vocabulary, types, and tests, and gets
its own subpath export:

```ts
import { defineConfig } from "@inoffensive/ci-cdk";
import { githubActions } from "@inoffensive/ci-cdk/github-actions";

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
pnpm fallow           # dead code + duplication + complexity; any subcommand: pnpm fallow health
pnpm fmt           # oxfmt, writes
pnpm fmt:check     # oxfmt --check
pnpm check            # fmt:check -> compile -> typecheck -> lint -> test -> fallow
```

Provider emitters assert their YAML with `expect(...).toMatchFileSnapshot("__snapshots__/<name>.yml")`
from the test file next to the emitter, so the golden files are reviewable in the diff.

## Tooling

- TypeScript 7.x, ESM only, `module`/`moduleResolution: nodenext`, strict flag set inline in
  `tsconfig.json` (see below).
- Build is `tsc` alone; no bundler. `exports` points straight at the emitted files.
- oxlint for linting (`.oxlintrc.json`), oxfmt for fmtting (`.oxfmtrc.json`).
- fallow for dead code, duplication, complexity, and architecture (`.fallowrc.json`, JSONC, so it
  carries comments; fallow owns validation of that file, not tsc). It runs clean on zero config --
  entry points are read from `package.json` `exports`/`bin`, so nothing is listed by hand. The config
  only sets `duplicates.minOccurrences: 3` (ignore pair-only clones) and keeps
  `unused-dependencies` at `warn` rather than failing the build.
- `pnpm fallow <subcommand>` reaches the rest: `health --hotspots`, `dupes`, `architecture`,
  `dead-code --trace <file>:<export>`, `inspect --file <path>`, and `audit --base <ref>` as the
  PR-scoped gate. `fallow doctor` diagnoses project detection without changing anything.
- Versioning and publishing are not wired yet: changesets plus a provenance-enabled release workflow
  are the intended path.
