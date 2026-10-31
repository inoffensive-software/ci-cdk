# 104: Secrets

**Spec:** `docs/specs/0009-gitlab-ci-grammar-completion.md`

**What to build:** `secrets`, the job keyword that fills variables from external providers.

**Blocked by:** 100 (Re-triage and target).

**Status:** ready-for-agent

- [ ] `Job.secrets` accepts the documented provider map, with provider names and their fields derived
      from the schema and docs; absent keys are not emitted.
- [ ] Job raw collides with `secrets`.
- [ ] The inventory exercises the shape without raw; `$.*.secrets` and its 27 paths are removed from the
      gap report.
- [ ] A fixture pins the shape (pinned real config where one exists, otherwise docs-derived with
      provenance).
- [ ] Tests cover provider variants, absent secrets, and ordering.
- [ ] `pnpm check` passes.
