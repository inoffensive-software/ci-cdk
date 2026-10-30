# 35: GitLab documented-grammar diff

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** Wire GitLab's vendored schema into the shared schema walker from spec 0005 and diff
it against the GitLab modelled set, so "supports GitLab CI" has a size and a gap list. Schema paths the
inventory cannot emit are gaps; modelled paths the schema rejects are overclaims.

**Blocked by:** 34 (GitLab schema conformance), and spec 0005's ticket 29 (the shared schema walker).
Do not start until that walker exists on main.

**Status:** ready-for-agent

- [ ] The shared walker is imported from `test/schemas/`; no GitLab copy is written.
- [ ] A provider-local `GAPS` list holds `{ path, reason, category }`, with `category` the closed union
      `unmodelled | out-of-scope | schema-noise`.
- [ ] A provider-local `OVERCLAIMS` list holds `{ path, reason }`.
- [ ] Every schema path is either modelled or declared; an undeclared path fails with the path and both
      remedies.
- [ ] Every declared row corresponds to a real path; an unused row fails.
- [ ] A modelled path the schema rejects is reported as an overclaim, and a schema path the inventory
      cannot emit is reported as a gap; neither direction absorbs the other.
- [ ] Gaps and overclaims use the inventory's notation, and the report is sorted, de-duplicated and
      asserted as sets of paths.
- [ ] The comparison runs in the normal suite. No new ADR: spec 0005's ADR 0011 already records the
      gate, the categories and the refresh rule; this ticket cites it and adds only provider data.
- [ ] `pnpm check` passes.
