# 34: GitLab schema vendoring and conformance

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** Vendor GitLab's official `ci.json` at the pinned commit and validate every inventory
document and every corpus entry's rendered output against it. Hidden templates are stripped first,
because the schema describes jobs and globals while GitLab accepts anchor-only data it does not model.

Fetch the blob from `gitlab-org/gitlab` at commit
`28aa2bf90771a11ecc2f86525bc8a70a49c4d810`, path
`app/assets/javascripts/editor/schema/ci.json` (MIT). Verify 128,105 bytes and SHA-256
`1c6eeb7d3a34c39996afbfe1ade220480eb05bbeae674e86d3c745dfeeded7fd`.

**Blocked by:** 33 (Coverage gate and hidden templates).

**Status:** ready-for-agent

- [ ] The schema is vendored byte for byte as `test/schemas/gitlab-ci.json`, keeps its upstream `$id`,
      and is excluded from formatting by the existing `test/schemas/*.json` ignore.
- [ ] A test fails if the vendored bytes differ from the pinned SHA-256.
- [ ] The conformance test validates every GitLab inventory document and every GitLab corpus entry's
      rendered output, with `templates` entries removed before validation.
- [ ] A deliberately invalid document fails the conformance test, so the check is not vacuous.
- [ ] `ajv` remains the existing pinned dependency, draft-07, strict mode off; no new dependency.
- [ ] `pnpm check` passes.
