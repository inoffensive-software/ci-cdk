# Provenance

Every config in this directory is vendored byte for byte from the commit named below, except the one
entry marked documentation-derived. Refreshing an entry means changing the SHA here and re-running its
corpus test; the vendored file itself is never edited, because a config we had to change is not
evidence that we support the original.

The comparison level is recorded per entry: `data` means the rendered output parses to the same value
as the file (see the corpus README and ADR 0005).

## terraform-images

- Repo: <https://gitlab.com/gitlab-org/terraform-images>
- Commit: `4230b972896ea9b4c23322855bcf76256e5ae1c9`
- Path: `.gitlab-ci.yml`
- Licence: MIT, Copyright (c) 2021 GitLab.org
- Vendored as: `terraform-images.yml`, SHA-256
  `a23bae8c45f5c88036203ec1b396ed7a2185627751f875e4418014c21fc03c9a`
- Comparison: data
- Why this entry: `stages`, `stage` and `script` in their modelled forms, plus `before_script`, a
  hidden `.terraform-versions` template, `workflow` `rules`, `image`, `services`, `needs`, job
  `rules`, `release` and a `parallel` matrix - the shapes the first slice must force through `raw`.

## labkit

- Repo: <https://gitlab.com/gitlab-org/labkit>
- Commit: `8024160e53afaa18991004aa3e06dd336665f983`
- Path: `.gitlab-ci.yml`
- Licence: MIT, Copyright (c) 2011-2026 GitLab, Inc.
- Vendored as: `labkit.yml`, SHA-256
  `ec24d2817707bdbaf093ea56b12a0ec9224f9a894cf95845f5c80501bc9e89ea`
- Comparison: data
- Why this entry: a fragment rather than a whole pipeline - `default` and `include` (local, project
  and component with `inputs`), `workflow` `rules` with `when: never`, ten hidden `.`-prefixed
  templates and anchors (`.go-cache` cache keys, matrix aliases), `parallel` matrices, `cache` with
  `files` and a `prefix`, `services`, `artifacts.reports`, `needs`, `trigger` and a `release`-stage
  pair built on `extends`. Thirteen jobs declare no `script` because they only override an included
  job; that shape is what ADR 0014 makes expressible.

### `!reference` caveat

`!reference` appears seven times, always as `changes: !reference [.name, changes]`. The `yaml`
package has no schema entry for the tag, so it drops the tag and keeps the tag's sequence as data:
`[".name", "changes"]`. The fixture therefore writes that array, and the data comparison cannot tell
a reference from a literal two-element list. The tag is invisible to this comparison by construction;
a tag-aware assertion is ticket 43. Nothing else about the entry depends on it.

## small-deferred (documentation-derived)

- Source: <https://docs.gitlab.com/ci/yaml/> (CI/CD YAML syntax reference), read 2026-10-31
- Not a vendored third-party config: the file pins the documented shapes of `inherit`, `hooks`,
  `dependencies`, `start_in`, `manual_confirmation` and `dast_configuration`, which no single pinned
  repository config exercised. Spec 0009 decision 5 allows a documentation-derived fixture for a
  shape with no real entry, marked as such here.
- Vendored as: `small-deferred.yml`, SHA-256
  `9a10af75338df37a422d9996ccd69e4845ed8fdb6d93351ab67b1a26a92b9052`
- Comparison: data
- Why this entry: both `inherit` selector forms (list and boolean), `hooks` and `default:hooks`,
  `dependencies` including a one-item list, `start_in` with `when: delayed`, `manual_confirmation`
  with `when: manual`, and the `dast_configuration` profile pair.

## gitlab-run (documentation-derived)

- Source: <https://docs.gitlab.com/ci/functions/>, <https://docs.gitlab.com/ci/yaml/#run>
- Not a vendored third-party config: the file pins the `run` step-list shapes, which no pinned
  repository config used. GitLab Functions is experimental, so the entry is marked documentation-derived
  under spec 0009 decision 5 and is shape evidence only, not proof that a real pipeline uses it.
- Read on: 2026-11-01
- Licence: n/a
- Vendored as: `gitlab-run.yml`, SHA-256
  `b8a01ed0f9cbb1231a16f94c42d21b763a19a2487d6dad7efa2644e04d7cc773`
- Comparison: data
- Why this entry: a function step with `env`, a function step with `inputs` (a string and a number),
  and a script step with `env` - the three shapes `run` accepts without the deprecated `step:` key or
  the map forms of a function reference, which stay declared gaps.

## gitlab-pages

- Repo: <https://gitlab.com/gitlab-org/gitlab-pages>
- Commit: `80b941cceb10cb8c18e6cb09314a20ff08847f3e`
- Path: `.gitlab-ci.yml`
- Licence: MIT, Copyright GitLab Inc.
- Vendored as: `gitlab-pages.yml`, SHA-256
  `99145262691ca02eb9faf0e6181d5dbde33bea4025c5ff1f5709386d81f2cd17`
- Comparison: data
- Why this entry: the include-heavy shape the other two entries miss - two local includes and a
  component include carrying its own `rules`, `workflow` rules, `default` image and tags, a hidden
  `.common` template with `variables` and a pull-only `cache`, and one job whose `needs: []`,
  `extends`, `script` and push-policy `cache` override that template.

## gitlab-secrets

- Source: documentation-derived, not vendored from a repository
- Pages: <https://docs.gitlab.com/ci/secrets/>, <https://docs.gitlab.com/ci/secrets/hashicorp_vault/>,
  <https://docs.gitlab.com/ci/secrets/aws_secrets_manager/>,
  <https://docs.gitlab.com/ci/secrets/gcp_secret_manager/>,
  <https://docs.gitlab.com/ci/secrets/azure_key_vault/> and
  <https://docs.gitlab.com/ci/secrets/secrets_manager/>
- Read on: 2026-10-31
- Licence: n/a
- Vendored as: `gitlab-secrets.yml`, SHA-256
  `cdb777eeb536a4ed58318656f8ff7257e80bd02b8f81d24c0eb76862aa9f6312`
- Comparison: data
- Why this entry: no public config was found that uses every `secrets` provider in one file. Each
  shape is copied from the provider page named above: Vault shorthand and engine, GCP Secret Manager
  with a numeric `version`, Azure Key Vault with a version, AWS Secrets Manager shorthand and its
  full map, GitLab Secrets Manager with a group `source`, plus `file: false` and `token`. The entry
  pins the shapes only; it is not evidence that a real pipeline uses them.

## gitlab-tokens

- Source: documentation-derived, not vendored from a repository
- Pages: <https://docs.gitlab.com/ci/yaml/#id_tokens> and
  <https://docs.gitlab.com/ci/yaml/#identity>
- Read on: 2026-11-01
- Licence: n/a
- Vendored as: `gitlab-tokens.yml`, SHA-256
  `8037f89aee0ea4d8ef4932a1a76b6a09f1012f4633056d6ba7c75a10e65433f4`
- Comparison: data
- Why this entry: no public config was found that declares `id_tokens` at both `default` and job
  level, so both levels are copied from the syntax reference: `default:id_tokens` with a single
  `aud`, a job `id_tokens` map with one token carrying a single audience and one carrying a list,
  and `identity: google_cloud`. `identity` is documented at job level only, so the entry does not
  invent a `default:identity` shape. The entry pins the shapes only; it is not evidence that a real
  pipeline uses them.
