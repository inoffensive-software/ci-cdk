# 55: Alias cross-directory test imports

**Spec:** none (review of PR #29; follow-up to the package alias in PR #22)

**What to build:** A test-only resolution alias for imports that cross a directory boundary under
`test/`, so a file says `@test/schemas/gap-debt.js` instead of `../../schemas/gap-debt.js`. Sibling
imports inside one directory stay `./`. The alias resolves to source, never to `dist`, and is not a
published package subpath.

The tree already resolves `@inoffensive/ci-cdk` and `@inoffensive/ci-cdk/*` to `src`; this is the
same idea for test support, which has no package entry point.

**Blocked by:** None (can start immediately).

**Status:** ready-for-agent

- [ ] One test-only alias resolves cross-directory imports under `test/` to the source files, with the
      same `.js` extension spelling the rest of the repo uses. `pnpm test` passes without a compile,
      so the alias cannot point at `dist`.
- [ ] Every cross-directory import under `test/` uses the alias; sibling `./` imports are unchanged.
      `test/schemas`, `test/corpus` and their provider subdirectories are all covered.
- [ ] The mechanism is one of: a `test/*` path in `tsconfig.json` with a matching `vitest.config.ts`
      alias, or a `package.json` `imports` entry (for example `#test/*.js` → `./test/*.ts`). Prove the
      chosen one under both `pnpm test` and `pnpm typecheck`; do not add a second copy of either.
- [ ] The alias is test-only: `package.json` `exports` is unchanged, so consumers cannot import it,
      and `pnpm compile` produces no extra output.
- [ ] `AGENTS.md` or `test/corpus/README.md` gains one line saying cross-directory test imports use
      the alias and sibling imports stay relative, so the next test follows the same rule.
- [ ] No behaviour change: same tests, same output, goldens untouched.
- [ ] `pnpm check` passes.
