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
