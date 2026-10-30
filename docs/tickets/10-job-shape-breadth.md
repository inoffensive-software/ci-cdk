# 10: Job shape breadth

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** A job that runs in a container, publishes to an environment, and needs
least-privilege permissions is expressible without falling back to `raw`. A job that calls a
reusable workflow is the same `Job` type with `uses`, `with` and `secrets` instead of `steps`.

**Blocked by:** 06 (Render a workflow), 07 (Expressions and typed scalars)

**Status:** done

- [x] Workflow level accepts `env`, `defaults.run` (`shell`, `working-directory`) and `concurrency`
      as a string or `{ group, "cancel-in-progress" }`.
- [x] `permissions` accepts `read-all`, `write-all`, or a map of scope to level, at workflow and job
      level.
- [x] A job accepts `environment` as a string or `{ name, url }`, `timeout-minutes` and
      `continue-on-error`.
- [x] A job accepts `container` and `services`, each with `image`, `credentials`, `env`, `ports`,
      `volumes` and `options`.
- [x] A job accepts `uses`, `with` and `secrets` as the reusable-workflow form, on the same `Job`
      type as the `steps` form.
- [x] `env`, `with`, `secrets` and `credentials` preserve author order.
- [x] A golden covers a container job with a service, an environment with a URL, and a reusable
      workflow job.
- [x] `pnpm check` passes.
