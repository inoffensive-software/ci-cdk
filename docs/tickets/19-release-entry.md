# 19: Release entry

**Spec:** `docs/specs/0003-github-actions-breadth.md`

**What to build:** The dispatch-and-release shape reproduces as data: `workflow_dispatch` choice
inputs with defaults and options, a workflow-level `environment`, a workflow `permissions` map, a
branch- and path-filtered push trigger including negated patterns, and a boolean workflow `env` value.
This is `trpc/trpc`'s release workflow, and no new production code is expected.

**Blocked by:** 18 (Scalar values in author maps, and the services entry)

**Status:** ready-for-agent

- [ ] The workflow is vendored verbatim at the pinned commit, with repo, commit, path, MIT licence and
      a one-line reason recorded in provenance.
- [ ] The fixture reproduces the entry as parsed data.
- [ ] The entry proves `workflow_dispatch` inputs of type choice with `options` and `default`, a
      string `environment`, a multi-scope `permissions` map, and `paths` entries beginning with `!`.
- [ ] The exhaustiveness gate is green for the entry.
- [ ] Any gap the entry exposes is either closed in this ticket or declared in the ledger with a
      reason; the fixture is never edited to avoid one.
- [ ] `pnpm check` passes.
