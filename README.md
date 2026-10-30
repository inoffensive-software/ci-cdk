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

| Subpath                                   | Provider                                                              | Status      |
| ----------------------------------------- | --------------------------------------------------------------------- | ----------- |
| `@inoffensive/ci-cdk/github-actions`      | [GitHub Actions](docs/providers/github-actions.md#documented-grammar) | Supported   |
| `@inoffensive/ci-cdk/gitlab-ci`           | GitLab CI                                                             | In Progress |
| `@inoffensive/ci-cdk/bitbucket-pipelines` | [Bitbucket Pipelines](docs/providers/bitbucket-pipelines.md)          | In Progress |

## Documentation

- `docs/architecture.md`: layers, invariants, and the decisions behind them.
- `docs/principles.md`: how code is written here, the default calls and what they reject.
- `docs/decisions/`: individual decision records.
- `docs/references/upstream-schemas.md`: where each provider's grammar is defined, and the YAML library rule.

## Development

See `AGENTS.md` for the repo map, commands, and the rules that keep the architecture intact.
