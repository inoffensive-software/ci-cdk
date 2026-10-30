# 11: Raw escape hatch

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** A workflow containing a key the vocabulary does not model is still expressible.
`raw` takes boundary-checked data, emits it after the modelled keys in author order, and refuses the
same values `fromValue` refuses, with a path.

**Blocked by:** 06 (Render a workflow)

**Status:** done

- [x] `raw` is available on a workflow, a job and a step, typed against `Value` from core, never
      `unknown` and never `any`.
- [x] Raw entries emit after the modelled keys, in author order, nested correctly at their level.
- [x] A raw value that the boundary rejects (function, symbol, bigint, `NaN`, `Date`, `Map`, `Set`,
      `undefined`) produces a diagnostic carrying the raw entry's path, not escaped output.
- [x] A raw key that collides with a modelled key is a diagnostic, because it would otherwise emit a
      duplicate key.
- [x] Raw on a job emits inside that job's body, and raw on a step inside that step's body, proven by
      one golden.
- [x] `pnpm check` passes.
