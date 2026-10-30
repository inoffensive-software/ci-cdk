# Provenance

Every config in this directory is vendored byte for byte from the commit named below. Refreshing an
entry means changing the SHA here and re-running its corpus test; the vendored file itself is never
edited, because a config we had to change is not evidence that we support the original.

The comparison level is recorded per entry: `data` means the rendered output parses to the same value
as the file (see the corpus README and ADR 0005).

## connect-express

- Repo: <https://bitbucket.org/atlassian/atlassian-connect-express>
- Commit: `d00fcf7836356c3156b29cb5710e29d6da4c03c9`
- Path: `bitbucket-pipelines.yml`
- Licence: Apache-2.0
- Bytes: 1094
- Lines: 28
- Comparison: data
- Why this entry: root `image`, a `default` pipeline, a `branches` selector, `oidc` and a pipe as
  the last item of a script - the tracer shapes the first slice must reproduce.
- Vendored as: `connect-express.yml`, SHA-256 `4ca824baaaea30212fdbb69aab0c6f7bc65e644d0c145e10a2c17cdd12b9bbf3`

## systemsdk-symfony

- Repo: <https://github.com/systemsdk/docker-nginx-php-symfony>
- Commit: `da31f3c30607a57f394338ce3b31d8bfc06a320a`
- Path: `bitbucket-pipelines.yml`
- Licence: MIT
- Bytes: 948
- Lines: 45
- Comparison: data
- Why this entry: `options.docker`, a `definitions.steps` group referenced by YAML anchor, and
  `tags` plus `pull-requests` alongside two branch selectors - the global and definition shapes the
  second slice must reproduce. The fixture writes the anchor's resolved data, so the shared step
  body appears once in `definitions.steps` and again inline in every selector.
- Vendored as: `systemsdk-symfony.yml`, SHA-256 `e5e3bbedb042c62189b66e7da2068766950c1417b2dc87fc698eb28636f3a56e`

## obuspa

- Repo: <https://github.com/BroadbandForum/obuspa>
- Commit: `59028beba21471d19bd3842ef2632ceb6ca8c7fc`
- Path: `bitbucket-pipelines.yml`
- Licence: BSD-3-Clause
- Bytes: 3071
- Lines: 60
- Comparison: data
- Why this entry: a root `clone`, self-hosted `runs-on` labels, artifacts and a multi-command
  `after-script` across three sequential default steps - the step body shapes the fourth slice must
  reproduce.
- Vendored as: `obuspa.yml`, SHA-256 `0f80bab81faae1e8b58087b4efdd363a9cc6c528e5baff26ed4a1140ddc18afc`

## rair-dapp

- Repo: <https://github.com/rairprotocol/rair-dapp>
- Commit: `0afccca0bd38a23e8fc2518cd1fb48612675b607`
- Path: `bitbucket-pipelines.yml`
- Licence: Apache-2.0
- Bytes: 2126
- Lines: 74
- Comparison: data
- Why this entry: `condition.changesets.includePaths` on every step, `caches` and `services` arrays
  selecting by name, and two `pull-requests` selectors - the conditioned shapes the fourth slice must
  reproduce.
- Vendored as: `rair-dapp.yml`, SHA-256 `35fd3f918a635cee9b8ad63526437fd33c9a47ab3f1b6857db620b3433edcebf`

## aligent-graphql-mesh

- Repo: <https://github.com/aligent/aligent-graphql-mesh>
- Commit: `8095504bbdcd878c3e3e7adf6e48ebf953c01c28`
- Path: `bitbucket-pipelines.yml`
- Licence: MIT
- Bytes: 4350
- Lines: 135
- Comparison: data
- Why this entry: `custom` pipelines, a `pull-requests` parallel group and two `branches` stages,
  plus `definitions` in all three forms, pipe variables and `size` - the composition shapes this
  entry must reproduce. The file uses YAML anchors, which the parser resolves, so the fixture writes
  the resolved data and each shared step body appears once in `definitions.steps` and again inline
  wherever the anchor is referenced.
- Vendored as: `aligent-graphql-mesh.yml`, SHA-256 `eb5de70a1a61c8b93f43610527a5ab27fc8d9e441dd39cabb7eda4b2b9ca1a47`

## artifacts-expanded

- Repo: <https://github.com/snyk-schmidtty/goof-artifactory>
- Commit: `6838e122fe6f749c7ff183e0fed0ab8dc415276c`
- Path: `bitbucket-pipelines.yml`
- Licence: Apache-2.0
- Bytes: 1481
- Lines: 39
- Comparison: data
- Why this entry: the map form of `artifacts` with `paths` and `download: true` on a step that also
  runs two pipes - the expanded shape whose list-form sibling every earlier entry already exercises.
- Vendored as: `artifacts-expanded.yml`, SHA-256 `043f661cc2ee991bac5316607fd05edbd48ea19bc24d1f5c6e08679c16ca2da6`

## Documentation-derived fixtures

Bitbucket documents the named `upload` entry and the name-list `download`, and no redistributable
config uses either shape. The synthetic fixture in `artifacts-expanded.test.ts` is built from
<https://support.atlassian.com/bitbucket-cloud/docs/child-pipeline-step-options/> retrieved
2026-10-29; no file is vendored for it.
