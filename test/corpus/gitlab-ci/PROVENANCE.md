# Provenance

Every config in this directory is vendored byte for byte from the commit named below. Refreshing an
entry means changing the SHA here and re-running its corpus test; the vendored file itself is never
edited, because a config we had to change is not evidence that we support the original.

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
