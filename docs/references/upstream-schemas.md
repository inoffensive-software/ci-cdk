# Upstream syntax oracles

Where each provider's authoritative config grammar lives. These are the sources of truth for the
hand-written types and the oracles for the conformance tests. They are vendored at
`test/schemas/<provider>.json` so a schema change upstream cannot break the build; refresh
deliberately.

| Provider            | Schema                                                                                                | Notes                                                                                                                                                         |
| ------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GitHub Actions      | `https://www.schemastore.org/github-workflow.json`                                                    | draft-07, `additionalProperties: false` at the root, community-maintained and lags the real spec. Useful as a typo net; never as a type source or sole truth. |
| GitLab CI           | `https://gitlab.com/gitlab-org/gitlab-foss/-/raw/master/app/assets/javascripts/editor/schema/ci.json` | Official, shipped with GitLab. Lives in the Rails repo under the editor integrations, so the path can move; pin a commit rather than `master`.                |
| Bitbucket Pipelines | `https://api.bitbucket.org/schemas/pipelines-configuration`                                           | Official, served by Atlassian. The least complete of the three; the docs remain the real oracle for its quirks.                                               |

Also available from https://www.schemastore.org/api/json/catalog.json (`schemas[].url`), which is how
these were found, and which lists the `fileMatch` globs each schema claims.

## How to use them

- Types are hand-written from prose docs, not generated. These schemas are loose draft-07 unions
  with no discriminators; generated types are unusable for a DSL and you would re-abstract them.

- Conformance test: parse the emitted YAML and validate it against the vendored schema. Refresh the
  vendored copy on demand (a requested feature, or periodically), not on a schedule that gates CI
  on upstream churn.

- Schema validation cannot catch dangling `needs`, duplicate job ids, or dependency cycles. Those
  live in `toDoc`.

## YAML library

`yaml` (eemeli), pinned to an exact version, no range. It provides ordered maps, scalar styles,
custom tags (`!reference`) and a CST, all of which `Doc` needs. Its output is part of the emitted
format contract, so an upgrade is a deliberate change that may alter bytes and therefore drift every
consumer's files. We need to have tests for automated dependency bumps to ensure that formatting remains unchanged
