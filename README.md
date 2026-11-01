# @inoffensive/ci-cdk

No one was born to write or read YAML. Why can't we use functions as the essential unit of composition for CI? Why have we decided that magical YAML syntax is a better solution than the one we had all along: code.

This project aims to end the tyranny of YAML by allowing for the specification of various CI providers' pipelines as Typescript which is automagically emitted as valid YAML.

## Why

- **Typechecking is good**: Catch annoying YAML syntax errors before merging a PR, not when the pipeline goes red.

- **Composition is code**: Shared workflow logic is a function returning a struct, imported and
  spread where needed. No YAML anchors, no `include:`, no `!reference` chaining across files.

- **Generated, not hand-maintained**: Each definition owns one file end to end. Use `git diff` to detect changes, and optionally commit them automatically.

This project is not attempting to be an ORM: each provider keeps its own vocabulary, types and warts. There is no
provider-neutral pipeline model.

## Usage

```ts
// ci/github.ts
import { writeFileSync } from "node:fs";

import { job, render, step, workflow } from "@inoffensive/ci-cdk/github-actions";

const build = job({
  id: "build",
  "runs-on": "ubuntu-latest",
  steps: [
    step({ uses: "actions/checkout@v4" }),
    step({ run: "pnpm install --frozen-lockfile && pnpm build" }),
  ],
});

writeFileSync(
  ".github/workflows/ci.yml",
  render(workflow({ name: "CI", on: ["push", "pull_request"], jobs: [build] })),
);
```

`render` returns the file's text; writing it is the caller's job, so where it goes, whether the
directory exists and whether this was a dry run all stay your call.

Composition is plain TypeScript: a shared job is a function you import and spread.

```ts
// ci/jobs.ts
import { step, type Job } from "@inoffensive/ci-cdk/github-actions";

const checkout = step({ uses: "actions/checkout@v4" });

export const withCheckout = (j: Job): Job => ({ ...j, steps: [checkout, ...(j.steps ?? [])] });
```

```ts
// ci/github.ts
import { withCache } from "./jobs.ts";
```

Relative imports carry the `.ts` extension, because Node resolves exactly what is written.

## Running it

No bundler, no runner and no package-manager script: `node ci/github.ts`. Node strips the types
itself, which needs Node 24 or later and three settings in your project's `tsconfig.json`:

```json
{
  "compilerOptions": {
    "noEmit": true,
    "erasableSyntaxOnly": true,
    "allowImportingTsExtensions": true
  }
}
```

`erasableSyntaxOnly` rejects anything Node cannot strip (enums, parameter properties, namespaces).
`allowImportingTsExtensions` permits the `.ts` specifiers above; it is only available with `noEmit`,
which is correct here because these files are never compiled. Without a `.ts` extension Node does
not find the file, and it does not rewrite `./jobs.js` to `./jobs.ts` either.

Keeping the file honest in CI:

```
node ci/github.mts
git status --porcelain -- .github/workflows   # edits, and a first commit you forgot
```

## Providers

<!-- providers:start -->

| Subpath                                   | Provider                                                                        | Modelled     | Unmodelled | Out of scope | Schema noise |
| ----------------------------------------- | ------------------------------------------------------------------------------- | ------------ | ---------- | ------------ | ------------ |
| `@inoffensive/ci-cdk/github-actions`      | [GitHub Actions](docs/providers/github-actions.md#documented-grammar)           | 82.8% (149)  | 1.1% (2)   | 10.0% (18)   | 6.1% (11)    |
| `@inoffensive/ci-cdk/gitlab-ci`           | [GitLab CI](docs/providers/gitlab-ci.md#documented-grammar)                     | 90.8% (662)  | 5.1% (37)  | 0.1% (1)     | 4.0% (29)    |
| `@inoffensive/ci-cdk/bitbucket-pipelines` | [Bitbucket Pipelines](docs/providers/bitbucket-pipelines.md#documented-grammar) | 99.3% (3699) | 0.0% (0)   | 0.5% (17)    | 0.2% (9)     |

Each provider is measured against the grammar in its pinned upstream schema. `Modelled` is the
share of documented paths the provider module can emit.`Unmodelled` is debt, `Out of scope` is a shape
the provider deliberately does not model (usually as it involves some form of YAML sharing primitives - just use code for this). `Schema noise` is grammar the schema permits but the
provider does not document. They may not sum exactly to 100% because of rounding.

<!-- providers:end -->

## Documentation

- `docs/architecture.md`: layers, invariants, and the decisions behind them.
- `docs/principles.md`: how code is written here, the default calls and what they reject.
- `docs/decisions/`: individual decision records.
- `docs/references/upstream-schemas.md`: where each provider's grammar is defined, and the YAML library rule.

## Development

See `AGENTS.md` for the repo map, commands, and the rules that keep the architecture intact.
