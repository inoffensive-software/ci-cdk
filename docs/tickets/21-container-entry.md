# 21: Container entry

**Spec:** `docs/specs/0003-github-actions-breadth.md`

**What to build:** A job that runs in a container reproduces as data, alongside job-level
`permissions`, `secrets: inherit` on a reusable-workflow job, and a numeric `with` value. All four are
modelled already and no corpus entry has ever exercised them, so this ticket is proof rather than
grammar: `prisma/prisma`'s PR code-security workflow.

**Blocked by:** 18 (Scalar values in author maps, and the services entry)

**Status:** ready-for-agent

- [ ] The workflow is vendored verbatim at the pinned commit, with repo, commit, path, Apache-2.0
      licence and a one-line reason recorded in provenance.
- [ ] The fixture reproduces the entry as parsed data.
- [ ] The entry proves a job `container` with an image, job-level `permissions` with two scopes,
      `secrets: inherit` on a `uses` job, and a numeric `with` value.
- [ ] The exhaustiveness gate is green for the entry.
- [ ] Any gap the entry exposes is either closed in this ticket or declared in the ledger with a
      reason; the fixture is never edited to avoid one.
- [ ] `pnpm check` passes.
