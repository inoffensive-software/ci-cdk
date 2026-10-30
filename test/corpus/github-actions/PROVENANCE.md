# Provenance

Every config in this directory is vendored byte for byte from the commit named below. Refreshing an
entry means changing the SHA here and re-running its corpus test; the vendored file itself is never
edited, because a config we had to change is not evidence that we support the original.

The comparison level is recorded per entry: `data` means the rendered output parses to the same value
as the file (see the corpus README and ADR 0005).

## got

- Repo: <https://github.com/sindresorhus/got>
- Commit: `66d0623ae0bf88a5158e08885e031184f26965c0`
- Path: `.github/workflows/main.yml`
- Licence: MIT, Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (<https://sindresorhus.com>)
- Vendored as: `got.yml`, SHA-256
  `51bfb8443fb18b7d7a19971ad09f1fd5145c4f1bf0dc634e9a4a403563889dfb`
- Comparison: data
- Why this entry: `on` as a sequence, `permissions`, a matrix with numeric axis values, a `name` and
  `runs-on` carrying expressions, and both job and step level keys.

## curl-checksrc

- Repo: <https://github.com/curl/curl>
- Commit: `a4eed8c7f39c1a24f073f5889623b8fb99b50b1a`
- Path: `.github/workflows/checksrc.yml`
- Licence: curl, Copyright Daniel Stenberg and contributors
- Vendored as: `curl-checksrc.yml`, SHA-256
  `bfc66c0abeb6cfbfa3b6525ec7092873bcb58bd565356f71ae27d8802b804fea`
- Comparison: data
- Why this entry: a `background: true` step and its bare `wait-all:` in the same job, several
  background steps named for a later wait, and a `timeout-minutes` on a `uses` step.

## anyhow

- Repo: <https://github.com/dtolnay/anyhow>
- Commit: `bb1b0f9af0f645d5fdf1ac63a1fcbf3975ee452c`
- Path: `.github/workflows/ci.yml`
- Licence: MIT OR Apache-2.0, Copyright (c) David Tolnay <dtolnay@gmail.com>
- Vendored as: `anyhow.yml`, SHA-256
  `bdf73245827ac89b712e188bfe7e3b4f6faf829a6a63ab5c4430d400ea033d0b`
- Comparison: data
- Why this entry: nine jobs, including a reusable-workflow job that most other jobs need, an `if`
  reading `needs.<id>.outputs.<out>`, two matrices, a `schedule` trigger beside bare events, job and
  step `env`, `timeout-minutes`, `continue-on-error` and an artifact upload. Its formatting cannot be
  reached byte for byte: flow-style matrices, a double-quoted cron, and `timeout-minutes` before
  `steps`.

## trpc-main

- Repo: <https://github.com/trpc/trpc>
- Commit: `708753ff1383c47c5f765694978db1000a86ee36`
- Path: `.github/workflows/main.yml`
- Licence: MIT, Copyright (c) 2023 Alex Johansson
- Vendored as: `trpc-main.yml`, SHA-256
  `cd08d368fb4f1265728f6099af96818aae8a0cd90d5c35b8130757bbd96f21c9`
- Comparison: data
- Why this entry: services with an env and a published port, scalar matrix axes, workflow
  concurrency, `continue-on-error`, `on.pull_request.types`, bare `merge_group`, `on.push.branches`,
  numeric `with` values, and `needs` as an array.

## trpc-release

- Repo: <https://github.com/trpc/trpc>
- Commit: `708753ff1383c47c5f765694978db1000a86ee36`
- Path: `.github/workflows/release.yml`
- Licence: MIT, Copyright (c) 2023 Alex Johansson
- Vendored as: `trpc-release.yml`, SHA-256
  `d878a97c3046f1e534695cba714f9382194e8c6a4fc8372f7c57d6b6b502dcba`
- Comparison: data
- Why this entry: `workflow_dispatch` inputs of type choice with options and defaults, a
  workflow-level `environment`, a multi-scope `permissions` map, `on.push` with branch and path
  filters including negated `!` patterns, and a boolean workflow `env` value.

## turbo-lsp

- Repo: <https://github.com/vercel/turborepo>
- Commit: `e158e859f804019fa48dd1af15bc247e4759d81e`
- Path: `.github/workflows/lsp.yml`
- Licence: MIT, Copyright (c) 2026 Vercel, Inc
- Vendored as: `turbo-lsp.yml`, SHA-256
  `c666dd4f96ed16852b06d7e3803243485376e8702ecdb2c771de2ca8d1cf3020`
- Comparison: data
- Why this entry: `run-name`, `workflow_call` inputs, matrix rows that are objects, boolean `with`
  values, job `outputs`, `environment`, `shell` and `working-directory`, and `if` conditions reading
  `inputs`.

## prisma-code-security

- Repo: <https://github.com/prisma/prisma>
- Commit: `1143e9310013a10c8d7f8a100491e844545320c2`
- Path: `.github/workflows/pr-code-security.yml`
- Licence: Apache-2.0, Copyright Prisma Data, Inc.
- Vendored as: `prisma-code-security.yml`, SHA-256
  `be23fe46d88bedfdb3703586e6f9cff2177f4093e70820f8dc9f78c16f918bf3`
- Comparison: data
- Why this entry: a job that runs in a `container` with an image, job-level `permissions` with two
  scopes, `secrets: inherit` on a `uses` job that has no `runs-on`, and a numeric `with` value.

## mlflow-js

- Repo: <https://github.com/mlflow/mlflow>
- Commit: `343f67625336fa4d4b2b83fd77cbade732e7cf19`
- Path: `.github/workflows/js.yml`
- Licence: Apache-2.0, Copyright 2018 Databricks, Inc.
- Vendored as: `mlflow-js.yml`, SHA-256
  `9975df602e4c260373d194940f363076d19f6704b3f11c25c1f03bed819b527a`
- Comparison: data
- Why this entry: workflow and job `cache-mode` values, a scalar matrix axis, workflow and job
  `defaults.run`, and `permissions: {}`.

## mindee-cron

- Repo: <https://github.com/mindee/mindee-api-nodejs>
- Commit: `4f26fe3f99a7d3ad1f9847bc2b2dfcc1332de0f0`
- Path: `.github/workflows/cron.yml`
- Licence: MIT, Copyright (c) Mindee
- Vendored as: `mindee-cron.yml`, SHA-256
  `aee829c6531d9514ff8719cf499451e62784bc5579f1dae987e769f13b3f9b2c`
- Comparison: data
- Why this entry: a schedule entry carrying a `timezone` beside its cron.

## uv-ai-policy

- Repo: <https://github.com/astral-sh/uv>
- Commit: `85b7a374a2f6bda197915f89d32f746143beb315`
- Path: `.github/workflows/ai-policy.yml`
- Licence: MIT OR Apache-2.0, Copyright (c) Astral Software Inc.
- Vendored as: `uv-ai-policy.yml`, SHA-256
  `274282a5f38f002ac74c02843e9d59c5134d516a3d3b0a7db482405d6de4db2b`
- Comparison: data
- Why this entry: `environment.deployment: false`, `type: number` dispatch inputs, `permissions: {}`,
  and an expression-bearing `runs-on`.

## mise-publish-version

- Repo: <https://github.com/jdx/mise>
- Commit: `ad805190efb10d0467069b8cf1b776ff612f5d24`
- Path: `.github/workflows/publish-version.yml`
- Licence: MIT
- Vendored as: `mise-publish-version.yml`, SHA-256
  `17a3541d5c5b3397f46647344cfc2db716cc53b2db777135d5afe8b2a3174d15`
- Comparison: data
- Why this entry: an `on.release` trigger carrying `types`, a workflow-level concurrency group
  carrying `queue: max` beside its `group`, a job-level `if` written as a literal block, and two
  multi-line `run` scripts.
