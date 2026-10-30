# 30: The schema diff, both declared lists, and ADR 0011

**Spec:** `docs/specs/0005-documented-grammar-coverage.md`

**What to build:** The comparison the spec exists for. Schema paths the vocabulary cannot emit are gaps;
modelled paths the schema does not allow are overclaims. Each is either closed or declared in a list
with a reason, both lists are asserted in both directions, and a schema refresh that introduces a path
nobody has ruled on fails the suite.

**Blocked by:** 29 (The schema walker)

**Status:** done

- [x] A provider-local `GAPS` list holds `{ path, reason, category }`, with `category` a closed union of
      `unmodelled`, `out-of-scope` and `schema-noise`.
- [x] A provider-local `OVERCLAIMS` list holds `{ path, reason }`.
- [x] Every schema path is either modelled or declared; an undeclared path fails with the path and both
      remedies.
- [x] Every declared row corresponds to a real path; an unused row fails.
- [x] A modelled path the schema does not allow is reported as an overclaim, and vice versa, so neither
      direction can absorb the other's rows.
- [x] `image_version` appears in neither list, as spec decision 14 requires: the inventory may only hold
      schema-valid documents, so the diff cannot see the arm, and the provider document keeps its prose
      note instead.
- [x] ADR 0011 records the gate, the closed category vocabulary, and the refresh rule: the schema is
      refreshed manually, a refresh is deliberate, and new paths fail until ruled on.
- [x] The comparison runs inside the normal suite, is provider-local where it names a provider, and
      leaves the walker shared.
- [x] The report is deterministic: sorted, de-duplicated, asserted as sets of paths.
- [x] `pnpm check` passes.
