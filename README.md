# CI CDK

No one was born to write or read YAML. Why can't we use functions as the essential unit of composition for CI? Why have we decided that magical YAML syntax is a better solution than the one we had all along: code.

This project aims to end the tyranny of YAML by allowing for the specification of various CI providers' pipelines as Typescript which is automagically emitted as valid YAML.

## Why

- **Typechecking is good**: Catch annoying YAML syntax errors before merging a PR, not when the pipeline goes red.

- **Composition is code, sharing is libraries**: If you want to share functionality across steps and pipelines, write a function. If you want to share a common pattern of CI configuration across repos or teams, write a module.

- **Generates vendor YAML, eject if you want to**: Adopting this library is not a one-way door. If you try it out and decide you hate it you've still got the generated vendor's YAML. Try it out, hate it and drop it if you want to.

## Project Philosophy

- **Not an ORM**: This project does not try to obfuscate or homogenise the DSL each vendor uses. We pass through properties as they are named by the upstream provider, just with stronger types and a less heinous syntax.

- **Sharing is code**: This project does not support YAML anchors or other sharing primitives from upstream providers. If you want to share snippets between definitions, you need to write a function which generates identical YAML. This may be duplicative, but it's also much simpler to reason about

## Usage

```ts
import { job, render, step, workflow } from "@inoffensive/ci-cdk/github-actions";

// This repo's PR pipeline
const ci = workflow({
  name: "CI",
  on: { push: { branches: ["main"] }, pull_request: {} },
  permissions: { contents: "read" },
  concurrency: { group: "ci-${{ github.ref }}", "cancel-in-progress": true },
  jobs: [
    job({
      id: "check",
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 20,
      steps: [
        step({ uses: "actions/checkout@v4" }),
        step({ uses: "pnpm/action-setup@v4" }),
        step({
          uses: "actions/setup-node@v4",
          with: { "node-version-file": ".node_version", cache: "pnpm" },
        }),
        step({ name: "Check", run: "bash tools/ci/ci.sh" }),
      ],
    }),
  ],
});

process.stdout.write(render(ci));
```

Generate the file:

```sh
node tools/ci/workflow.mts > .github/workflows/ci.yml
```

An example of shared behaviour:

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

A sample PR check to ensure this file is kept up to date:

```
node tools/ci/workflow.mts > .github/workflows/ci.yml
git status --porcelain -- .github/workflows   # edits, and a first commit you forgot
```

## Providers

<!-- providers:start -->

| Subpath                                   | Provider                                                                        | Modelled     | Unmodelled | Out of scope | Schema noise |
| ----------------------------------------- | ------------------------------------------------------------------------------- | ------------ | ---------- | ------------ | ------------ |
| `@inoffensive/ci-cdk/github-actions`      | [GitHub Actions](docs/providers/github-actions.md#documented-grammar)           | 82.8% (149)  | 1.1% (2)   | 10.0% (18)   | 6.1% (11)    |
| `@inoffensive/ci-cdk/gitlab-ci`           | [GitLab CI](docs/providers/gitlab-ci.md#documented-grammar)                     | 85.6% (624)  | 10.3% (75) | 0.1% (1)     | 4.0% (29)    |
| `@inoffensive/ci-cdk/bitbucket-pipelines` | [Bitbucket Pipelines](docs/providers/bitbucket-pipelines.md#documented-grammar) | 99.3% (3699) | 0.0% (0)   | 0.5% (17)    | 0.2% (9)     |

Each provider is measured against the grammar in its pinned upstream schema. `Modelled` is the
share of documented paths the provider module can emit.`Unmodelled` is debt, `Out of scope` is a shape
the provider deliberately does not model (usually as it involves some form of YAML sharing primitives - just use code for this). `Schema noise` is grammar the schema permits but the
provider does not document. They may not sum exactly to 100% because of rounding.

<!-- providers:end -->

## Motivation

My motivations for creating this repo are three-fold:

1. I feel like CDK is the correct pattern for most configuration and never understood why it wasn't a supported way of authoring CI pipelines.

2. I was curious about how well and how cost effective Chinese coding models are - the answer is very well and very cheaply

3. I wanted to try my hand at harness-engineering a repo and have it produce a useful tool semi-autonomously

## Development

See `AGENTS.md` for the repo map, commands, and the rules that keep the architecture intact.
