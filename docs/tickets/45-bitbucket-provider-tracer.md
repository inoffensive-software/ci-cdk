# 45: Bitbucket provider tracer

**Spec:** `docs/specs/0007-bitbucket-pipelines-provider.md`

**What to build:** The whole vertical path for the first Bitbucket slice: the `bitbucket-pipelines`
subpath, the document and pipeline structs, the `step` and `pipe` builders, `toDoc` with
document-level validation, `render`, one golden, one corpus entry and ADR 0013. This is the tracer
bullet: types, lowering, emitter, first corpus comparison and public surface in one ticket.

Follow TDD: write the failing render and diagnostic tests first, then the module. The provider imports
core and nothing else.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `@inoffensive/ci-cdk/bitbucket-pipelines` resolves after compilation and exports `render`,
      `toDoc`, `pipelineConfig`, `step`, `pipe` and the struct types; nothing else in the provider is
      reachable by consumers.
- [ ] `render(pipelineConfig(...))` emits root `image` first, then `pipelines`; `default` is a
      sequence of items and `branches` entries are `{ pattern, pipeline }`, emitted as
      `pattern: [ ... ]` in array order.
- [ ] A `step` item emits one `step:` map with `name`, `oidc` and `script`, in the spec's
      alphabetical order, and absent fields are not emitted.
- [ ] A script item may be a string or a pipe; a pipe emits `- pipe: <id>` with its `variables` map
      beneath it, and parsing the output returns the same sequence.
- [ ] `raw` is accepted at document and step level, appended after the modelled keys, and a colliding
      key is refused with a diagnostic at the author's path.
- [ ] `toDoc` throws one `DiagnosticError` carrying every problem when: no pipeline is declared, a
      pipeline is empty, a selector pattern is empty or duplicated, a script is empty, or a pipe id is
      empty.
- [ ] Diagnostics use core's path notation and walk through the item wrapper
      (`$.pipelines.branches[1].pattern`, `$.pipelines.default[0].step.script`).
- [ ] `render(..., { header: "" })` suppresses the header; the default header is unchanged.
- [ ] `toDoc` is public, and one structural test asserts that an item emits exactly one of its keys
      and that modelled keys precede raw keys.
- [ ] `atlassian/atlassian-connect-express` at commit
      `d00fcf7836356c3156b29cb5710e29d6da4c03c9` is vendored from the Bitbucket API, its SHA-256
      `4ca824baaaea30212fdbb69aab0c6f7bc65e644d0c145e10a2c17cdd12b9bbf3` is recorded in
      `PROVENANCE.md` in the form the shared provenance test parses, and the entry compares as parsed
      data.
- [ ] Any raw key the entry needs is declared in the coverage ledger with a reason.
- [ ] A golden pins the rendered `connect-express` fixture with the header suppressed.
- [ ] ADR 0013 records the two-function surface, the exported builders, the absence of leaves, and why
      the document type is `PipelineConfig`.
- [ ] The provider has its own boundary zone and the package export map has the
      `./bitbucket-pipelines` subpath.
- [ ] The provider adds no core module and no new dependency.
- [ ] `pnpm check` passes.
