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

## custom-vars-nakama

- Repo: <https://github.com/Nakama-Partnering-Services/nakama-project-scaffolding>
- Commit: `fd8bfc6f5b7c9e3ada89c99c8d8aec27d586a6f0`
- Path: `bitbucket-pipelines.yml`
- Licence: MIT
- Bytes: 7188
- Lines: 171
- Comparison: data
- Why this entry: a second shape of the same declaration - a credentialed root image, `clone.depth`,
  a `pull-requests` selector and branches beside three custom pipelines, two of which open with
  `variables`. Its values are quoted strings, so it compares under the default schema.
- Vendored as: `custom-vars-nakama.yml`, SHA-256 `ca31bd3371cc55bc4ef1ce51a251f65a754e7cdd346eeb916645997da3b40af5`

## triggers-alibaba

- Repo: <https://github.com/alibaba/open-code-review>
- Commit: `476f661f26e5576a36003abe7a37d5ff8546b2df`
- Path: `examples/bitbucket_pipelines/bitbucket-pipelines.yml`
- Licence: Apache-2.0
- Bytes: 10666
- Lines: 264
- Comparison: data
- Why this entry: a `pullrequest-push` trigger that starts a custom pipeline, whose step is shared
  through a YAML anchor in `definitions.steps`. This is a repository example file, not a live config.
- Vendored as: `triggers-alibaba.yml`, SHA-256 `a86615388514cb55322d530fe1553b0f108a8317e4611a52ec568966a4fba032`

## triggers-vardot

- Repo: <https://github.com/Vardot/ddev-dev-tools>
- Commit: `515f6901367458f75ee4956f8172e8566d7879f7`
- Path: `examples/bitbucket-pipelines.yml.example`
- Licence: Apache-2.0
- Bytes: 8216
- Lines: 163
- Comparison: data
- Why this entry: a second trigger shape - one `pullrequest-push` entry whose condition filters the
  destination branch across many environments, starting a custom pipeline built from one sequential
  step and a three-way parallel group. This is a repository example file, not a live config.
- Vendored as: `triggers-vardot.yml`, SHA-256 `f0ca7e778d8dc647a6b72d8eac626a4909258f680ecfe5c01be3d77713a94f8e`

## runtime-chaosgroup

- Repo: <https://github.com/ChaosGroup/cg2_2014_demo>
- Commit: `9cb7d426ec3feb9b5ec51ca2aaf9173f203fa921`
- Path: `bitbucket-pipelines.yml`
- Licence: MIT
- Bytes: 587
- Lines: 25
- Comparison: data
- Why this entry: a commented-out arm entry beside a live `runtime.cloud.arch: x86` step inside a
  parallel group - the arch arm no other config writes.
- Vendored as: `runtime-chaosgroup.yml`, SHA-256 `53f05b79273d74f8d8dff5da77099b98982c19c188625f1a3564afae9d923bde`

## Documentation-derived fixtures

Bitbucket documents the named `upload` entry and the name-list `download`, and no redistributable
config uses either shape. The synthetic fixture in `artifacts-expanded.test.ts` is built from
<https://support.atlassian.com/bitbucket-cloud/docs/child-pipeline-step-options/> retrieved
2026-10-29; no file is vendored for it.

The same page, retrieved 2026-10-29, is the only evidence for the child-pipeline step: its
`input-variables` example declares a parent custom pipeline with a `variables` item, a `step` with
`type: pipeline`, `custom` and five `input-variables`, and the child pipeline that reads two of them.
No licence-clean config uses the shape, so `child-pipelines.fixture.ts` is synthetic,
documentation-derived, and validated against the pinned schema; no file is vendored and there is no
commit to pin.

## Schema-derived fixtures

The pinned schema copied 2026-10-29 (`test/schemas/bitbucket-pipelines.json`) types a custom
variable's `description` as a string, but no vendored config uses that key. The synthetic fixture in
`src/bitbucket-pipelines/custom-variables.test.ts` covers it from the schema; no file is vendored for
it. Every other variable key is exercised by `custom-vars-nakama.yml` and the inventory.

The same pinned schema, copied 2026-10-29, types an artifact upload's `type`, `capture-on`, `depth`
and `ignore-paths`, and no corpus config and no Atlassian page documents them. `ArtifactUpload`
carries all four, the inventory exercises them at every upload position, and
`src/bitbucket-pipelines/artifacts.test.ts` covers their emission and the depth floor; no file is
vendored for them.

The same pinned schema, copied 2026-10-29, types a step's `auth.system.scopes` and the pipeline's
top-level `labels` map, and no corpus config and no Atlassian page documents either. `Step.auth` and
`PipelineConfig.labels` carry both, the inventory exercises them at every step position and at the
document root, and `src/bitbucket-pipelines/auth-labels.test.ts` covers their emission and
validation; no file is vendored for them.

The same pinned schema, copied 2026-10-29, is the only description of the agent runtime:
`definitions.agents` and its `agent_definition`, and the `agent_task` arm of a script item, including
`agent_config`, `agent_permissions`, `agent_provider` and `agent_setup_script`. No corpus config uses
the family and no Atlassian page documents its keys, so `agent-runtime.fixture.ts` is synthetic and
schema-derived, `src/bitbucket-pipelines/agent-runtime-validation.test.ts` covers its diagnostics,
and no file is vendored for it. This is the only family whose evidence is the schema alone.
