# 63: Child pipelines

**Spec:** `docs/specs/0008-bitbucket-grammar-completion.md`

**What to build:** A step that starts another pipeline: `type: pipeline`, a `custom` target and `input-variables`, plus the validation that keeps a child step from carrying options Bitbucket rejects.

**Blocked by:** 59 (Expanded artifacts)

**Status:** done

- [x] `Step` gains `type?: "pipeline"`, `custom?: Text` and `"input-variables"?: Readonly<Record<string, Text>>`, emitted in their alphabetical positions.
- [x] A step with `type: "pipeline"` requires a non-empty `custom`; without it the document is refused at the step's `custom` path.
- [x] A child step that also sets `deployment`, `image`, `clone`, `oidc`, `services`, `caches`, `runs-on`, `size`, `runtime` or `trigger` is refused, naming each property and the step path.
- [x] An inline step still requires `script`; a child step does not, and a child step with no `script` is not refused.
- [x] A documentation-derived fixture reproduces the child-pipeline example from `https://support.atlassian.com/bitbucket-cloud/docs/child-pipeline-step-options/` (retrieved 2026-10-29), including a parent custom pipeline with declared variables, a child step with `custom` and five `input-variables`, and a child pipeline. PROVENANCE records the source as documentation, with no vendored file and no commit.
- [x] No corpus entry can be added: no licence-clean real config exists. The fixture is synthetic and the test asserts rendered bytes and their parse.
- [x] Inventory, exhaustiveness gate and documented-grammar lists are re-derived; the stale-row check is empty, and the child-pipeline paths leave GAPS.
- [x] Goldens are added; no existing golden changes.
- [x] `pnpm check` passes.
