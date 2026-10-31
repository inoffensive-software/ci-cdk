# 103: The run step list

**Spec:** `docs/specs/0009-gitlab-ci-grammar-completion.md`

**What to build:** `run`, the GitLab Functions step list that replaces `script`. It needs an ADR because
it changes the job body model, not just adds a field.

**Blocked by:** 100 (Re-triage and target).

**Status:** ready-for-agent

- [ ] `Job.run` accepts the documented step list shape; it is emitted next to `script` in the fixed order.
- [ ] A job may not declare both `run` and `script`; the diagnostic names both paths.
- [ ] Job raw collides with `run`.
- [ ] The inventory exercises the shape without raw; the `$.*.run` gap row and its 32 paths are removed.
- [ ] An ADR records the replacement relationship and why `script` remains.
- [ ] A docs-derived fixture is marked in provenance; tests cover shape, mutual exclusion and ordering.
- [ ] `pnpm check` passes.
