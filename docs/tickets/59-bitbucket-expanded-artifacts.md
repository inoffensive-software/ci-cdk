# 59: Expanded artifacts

**Spec:** `docs/specs/0008-bitbucket-grammar-completion.md`

**What to build:** The map form of `artifacts`, so a step can publish a filtered set of paths, download everything, download named artifacts, or publish several named uploads, without `raw`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `Artifacts` is either the existing path list or a map with `paths`, `download` (boolean or name list) and `upload` (named entries with `paths`), and is exported.
- [x] Emission order is `download`, `paths`, `upload`; an upload emits `name` then `paths`; absent keys are not emitted.
- [x] An upload with an empty name or no paths is refused with a diagnostic at the upload's path.
- [x] `snyk-schmidtty/goof-artifactory` at `6838e122fe6f749c7ff183e0fed0ab8dc415276c` is vendored byte-identically (Apache-2.0, 1481 bytes, 39 lines, SHA-256 `043f661cc2ee991bac5316607fd05edbd48ea19bc24d1f5c6e08679c16ca2da6`), recorded in PROVENANCE, and compares as parsed data.
- [x] A synthetic fixture covers the named `upload` form and the name-list `download`, marked documentation-derived in PROVENANCE, because no redistributable real config uses it.
- [x] Inventory, exhaustiveness gate and documented-grammar lists are re-derived; the stale-row check is empty.
- [x] `capture-on`, `depth`, `ignore-paths` and upload `type` stay out of this slice and keep their
      declared rows; ticket 66 models them from the pinned schema.
- [x] Goldens are added; no existing golden changes.
- [x] `pnpm check` passes.
