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
