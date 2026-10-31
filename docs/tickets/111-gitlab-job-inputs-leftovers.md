# 111: Job inputs and leftovers

**Spec:** `docs/specs/0009-gitlab-ci-grammar-completion.md`

**What to build:** The last unmodelled children: job `inputs`, `artifacts.reports.*` object variants,
trigger include `artifact`/`job`, and the remaining one-path keys from the gap report.

**Blocked by:** 100 (Re-triage and target).

**Status:** ready-for-agent

- [ ] Job `inputs` accepts the documented typed-input map (`type`, `options`, `regex`, `description`,
      `default`).
- [ ] The remaining one-path keys in `schema-gap-debt.json` are each either modelled or reclassified
      with a reason; no `unmodelled` row is left without a ticket.
- [ ] The inventory exercises every new key without raw; the corresponding gap rows are removed.
- [ ] Tests cover the input variants and each leftover shape.
- [ ] `pnpm check` passes.
