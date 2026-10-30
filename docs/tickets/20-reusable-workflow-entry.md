# 20: Reusable-workflow entry: run-name, workflow_call inputs, object matrix rows

**Spec:** `docs/specs/0003-github-actions-breadth.md`

**What to build:** A reusable workflow with a typed interface reproduces as data. Three vocabulary
additions are forced by the entry and each is visible in the emitted file: `run-name` directly after
`name`, `on.workflow_call.inputs` limited to string and boolean inputs, and matrix axes whose values
are flat records of scalars. The entry is `vercel/turborepo`'s LSP pipeline.

**Blocked by:** 18 (Scalar values in author maps, and the services entry)

**Status:** done

- [x] `run-name` is accepted on a workflow, typed to take a leaf, and emitted directly after `name`
      with no other key reordered.
- [x] `on.workflow_call` accepts typed inputs with `description`, `required` and `default`, limited to
      the string and boolean arms; `choice`, `environment` and `number` are rejected by the type.
- [x] An empty `workflow_call` options object still emits `null`.
- [x] A matrix axis accepts a flat record of scalars as a value, preserves the author's key order, and
      omits members a row does not set; a scalar matrix axis keeps emitting numbers as numbers.
- [x] `toDoc` assertions pin the `run-name` position and the shape of an object matrix row, because a
      data diff cannot say which stage produced them.
- [x] The workflow is vendored verbatim at the pinned commit, with repo, commit, path, MIT licence and
      a one-line reason recorded in provenance, and reproduces as parsed data.
- [x] The exhaustiveness gate is green for the entry, and the ledger gains no rows.
- [x] `pnpm check` passes.
