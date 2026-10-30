# @inoffensive/ci-cdk

No one was born to write or read YAML. Why can't we use functions as the essential unit of composition for CI? Why have we decided that magical YAML syntax is a better solution than the one we had all along: code.

This project aims to end the tyranny of YAML by allowing for the specification of various CI providers' pipelines as Typescript which is automagically emitted as valid YAML.

## Why

- **Typechecking is good**: Catch annoying YAML syntax errors before merging a PR, not when the pipeline goes red.

- **Composition is code**: Shared workflow logic is a function returning a struct, imported and
  spread where needed. No YAML anchors, no `include:`, no `!reference` chaining across files.

- **Generated, not hand-maintained**: Each definition owns one file end to end. Use `git diff` to see detect and (optionally) automatically commit changes.

This project is not attempting to be an ORM: each provider keeps its own vocabulary, types and warts. There is no
provider-neutral pipeline model.

## Usage

```ts
// ci/github.ts
import { write } from "@inoffensive/ci-cdk";
import { render, workflow, job, step } from "@inoffensive/ci-cdk/github-actions";

const build = job({
  id: "build",
  "runs-on": "ubuntu-latest",
  steps: [
    step({ uses: "actions/checkout@v4" }),
    step({ run: "pnpm install --frozen-lockfile && pnpm build" }),
  ],
});

write(
  ".github/workflows/ci.yml",
  render(workflow({ name: "CI", on: ["push", "pull_request"], jobs: [build] })),
);
```

Composition is plain JavaScript — a shared job is a function you import and spread:

```ts
const withPnpmCache = (j: Job): Job => ({ ...j, steps: [cacheStep, ...j.steps] });
```

Keeping the file honest in CI:

```
node ci/github.ts && git diff --exit-code -- .github/workflows
```

## Providers

| Subpath                                   | Provider            | Status      |
| ----------------------------------------- | ------------------- | ----------- |
| `@inoffensive/ci-cdk/github-actions`      | GitHub Actions      | In Progress |
| `@inoffensive/ci-cdk/gitlab-ci`           | GitLab CI           | Planned     |
| `@inoffensive/ci-cdk/bitbucket-pipelines` | Bitbucket Pipelines | Planned     |

## Documentation

- `docs/architecture.md` — layers, invariants, and the decisions behind them.
- `docs/decisions/` — individual decision records.
- `docs/providers/<provider>.md` — per-provider coverage and quirks.

## Development

See `AGENTS.md` for the repo map, commands, and the rules that keep the architecture intact.
