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
