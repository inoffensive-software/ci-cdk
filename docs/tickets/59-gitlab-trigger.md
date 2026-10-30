# 59: Model the job trigger

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** The `trigger` job keyword, so the last corpus key that no ticket in this slice owns
is expressible. Labkit's `conformance-spec` job triggers `gitlab-org/quality/tooling/labkit-spec` with
a branch and `strategy: depend`, and the ledger cannot reach empty while that key is raw.

The trigger is emitted as data, never resolved: the target project, branch and child include are
strings and maps like every other reference in this library.

**Blocked by:** 42 (Delivery and scheduling), because it owns the job emission order this field joins.

**Status:** ready-for-agent

- [ ] `trigger` accepts `Text`, a project trigger (`project`, `branch`, `ref`, `strategy`, `inputs`),
      or a child-pipeline trigger (`include` as one or more include entries, `strategy`), and emits at
      the spec's fixed position after `release`.
- [ ] Job `raw` refuses `trigger` once the field exists, like every other modelled key.
- [ ] The labkit fixture moves `trigger` from job `raw` to the field; the corpus still passes by data
      equality and the `$.jobs[19].raw.trigger` ledger row is deleted.
- [ ] The inventory exercises both trigger forms without `raw`; the schema gap report deletes the
      `$.*.trigger` out-of-scope row, regenerates any still-missing children, and the stale-gap
      invariant stays green.
- [ ] Validation does not resolve the target or the child include; a project that does not exist still
      renders.
- [ ] Tests cover both forms, absent trigger, raw collision, and the ledger delta.
- [ ] `pnpm check` passes.
