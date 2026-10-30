# 25: GitLab corpus, first entry

**Spec:** `docs/specs/0004-gitlab-ci-provider.md`

**What to build:** The first real GitLab config, vendored verbatim at a pinned commit and reproduced
as parsed data, plus the coverage-debt ledger that counts every key it needs through `raw`. This is
the first measurable answer to "supports GitLab CI".

Fetch the bytes from
`https://gitlab.com/gitlab-org/terraform-images/-/raw/4230b972896ea9b4c23322855bcf76256e5ae1c9/.gitlab-ci.yml`
(or the equivalent repository-files API raw endpoint) and verify SHA-256
`a23bae8c45f5c88036203ec1b396ed7a2185627751f875e4418014c21fc03c9a`. Do not edit the file after
fetching.

**Blocked by:** 24 (GitLab raw escape hatch).

**Status:** ready-for-agent

- [ ] The upstream file is vendored byte for byte under the GitLab corpus directory, with repo,
      commit `4230b972896ea9b4c23322855bcf76256e5ae1c9`, path `.gitlab-ci.yml`, MIT licence, the
      SHA-256 above, and comparison mode `data` recorded in provenance.
- [ ] A fixture reproduces the file's parsed data through `render(fixture, { header: "" })`; the test
      parses both sides with the `yaml` package and asserts deep equality.
- [ ] The fixture writes `workflow`, `variables` and the hidden `.terraform-versions` template through
      pipeline raw, and the unmodelled keywords of all five jobs through job raw; `stages`, `stage`
      and `script` use the modelled fields.
- [ ] No byte-equality assertion is added for this entry.
- [ ] A coverage-debt ledger lists every raw path the fixture uses, each with a one-line
      vocabulary-gap reason; the ledger test asserts set equality in both directions and rejects an
      empty reason.
- [ ] The ledger contains no byte-fidelity rows, because this entry is not compared byte for byte.
- [ ] The vendored file is unmodified: a checksum test or the provenance test fails if it changes.
- [ ] `pnpm check` passes.
