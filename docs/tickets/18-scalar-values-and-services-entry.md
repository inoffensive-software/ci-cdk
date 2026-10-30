# 18: Scalar values in author maps, and the services entry

**Spec:** `docs/specs/0003-github-actions-breadth.md`

**What to build:** A workflow whose `with` value is the number `0` emits the number `0`, and a job
that declares a Postgres service with env and a published port is expressible without `raw`. The
first corpus entry the current vocabulary could not say at all: `trpc/trpc`'s PR pipeline, with
services, scalar matrix axes, `concurrency`, `continue-on-error`, `on.pull_request.types`, bare
`merge_group`, `on.push.branches` and numeric `with` values.

**Blocked by:** 17 (Exhaustiveness gate and inventory fixture)

**Status:** ready-for-agent

- [ ] `with`, `env` and container `env` accept a string, a number, a boolean or a leaf, at workflow,
      job, step and container level, and a number survives render and parse as a number.
- [ ] The boundary parser still refuses a value that is not a scalar, with a diagnostic carrying the
      entry's path.
- [ ] The `trpc/trpc` workflow is vendored verbatim at the pinned commit, with repo, commit, path,
      MIT licence and a one-line reason recorded in provenance.
- [ ] The fixture reproduces the entry as parsed data, with no `raw` used for a modelled key.
- [ ] The exhaustiveness gate is green for the entry, and the ledger gains no rows.
- [ ] `pnpm check` passes.
