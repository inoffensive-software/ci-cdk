# 23: GitLab provider tracer

**Spec:** `docs/specs/0004-gitlab-ci-provider.md`

**What to build:** The whole vertical path for the first GitLab slice: the `gitlab-ci` subpath, its
`Pipeline`/`Job`/`Script` types, `pipeline` and `job` builders, `toDoc` with document-level
validation, `render`, one golden, and ADR 0008. This is the tracer bullet: types, lowering, emitter,
first golden and public surface in one ticket, not a horizontal layer.

Follow TDD: write the failing render and diagnostic tests first, then the module. The provider imports
core and nothing else.

**Blocked by:** none.

**Status:** done

- [x] `@inoffensive/ci-cdk/gitlab-ci` resolves after compilation and exports `render`, `toDoc`,
      `pipeline`, `job`, and the types `Pipeline`, `Job`, `Script`; nothing else in the provider is
      reachable by consumers.
- [x] `render(pipeline({ stages, jobs }))` emits `stages` first, then one map entry per job in array
      order keyed by `name`, each job emitting `stage` when set and then `script`.
- [x] `name` never appears inside an emitted job body.
- [x] `script` accepts a single string and a string array; both render, and parsing the output
      returns the same string or the same ordered string list.
- [x] A script string containing `: `, ` #`, `yes`, `1.10`, or a newline renders as valid YAML whose
      parsed value is the original string.
- [x] An empty `stages` array emits `[]`.
- [x] `toDoc` is public and one structural test asserts the lower, stable shape: named map entries in
      array order, identity field absent, modelled keys before raw keys.
- [x] `toDoc` throws one `DiagnosticError` carrying every problem when: a job name is empty,
      duplicated, a GitLab global keyword, or starts with `.`; a stage name is empty or duplicated; a
      job's explicit or implicit stage is not available; a script is empty.
- [x] Diagnostics use core's path notation and point at the author's field (`$.jobs[2].stage`,
      `$.stages[1]`, `$.jobs[1].name`); a duplicated job name is reported at every occurrence.
- [x] `.pre` and `.post` are accepted as a job stage with or without `stages`; the default available
      stages are `.pre`, `build`, `test`, `deploy`, `.post`; an omitted job stage means `test`.
- [x] `render(..., { header: "" })` suppresses the header and the default header is unchanged.
- [x] A golden pins a two-stage pipeline with two jobs, in a file next to the provider's tests.
- [x] ADR 0008 records the two-function public surface, cites ADR 0003, and records that the provider
      exports no leaves.
- [x] The provider has its own boundary zone and the package export map has the `./gitlab-ci` subpath.
- [x] The provider adds no core module and no new dependency; the only core edit is the approved
      serializer option recorded in ADR 0009.
- [x] `pnpm check` passes.
