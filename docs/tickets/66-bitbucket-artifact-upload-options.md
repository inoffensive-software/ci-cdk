# 66: Artifact upload options

**Spec:** `docs/specs/0008-bitbucket-grammar-completion.md`

**What to build:** the rest of an artifact upload entry: `type`, `capture-on`, `depth` and `ignore-paths`, so the expanded artifacts family is complete rather than partially modelled.

**Blocked by:** 59 (Expanded artifacts)

**Status:** done

- [x] `ArtifactUpload` gains `type?: "shared" | "scoped" | "test-reports"`, `"capture-on"?: "success" | "failed" | "always"`, `depth?: number` and `"ignore-paths"?: readonly string[]`.
- [x] Emission is alphabetical after `name` and before `paths`: `capture-on`, `depth`, `ignore-paths`, `name`, `paths`, `type`; absent keys are not emitted.
- [x] A `depth` below 1 is refused at its path; `type` and `capture-on` stay closed unions, so an unknown value is a type error rather than an emitted string.
- [x] The shape is schema-derived: no corpus config and no Atlassian page documents these four
      keys. The vocabulary carries them and the provider page marks them unproven in the close-out
      (ticket 65).
- [x] The inventory exercises all four keys at every position where an upload can appear; the documented-grammar rows for them leave GAPS, and the stale-row check is empty.
- [x] The provider page's generated blocks are regenerated at the phase close-out (ticket 65),
      which also rewrites Non-goals; this slice leaves the page to that pass.
- [x] Goldens are added or updated deliberately; no unrelated golden changes.
- [x] `pnpm check` passes.
