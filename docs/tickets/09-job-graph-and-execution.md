# 09: Job graph and execution fields

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** Jobs can depend on each other and fan out over a matrix. `needs` accepts one id or
an array and preserves the shape the author wrote, a condition can be a leaf, and a numerical matrix
axis emits numbers.

**Blocked by:** 06 (Render a workflow), 07 (Expressions and typed scalars)

**Status:** ready-for-agent

- [ ] `needs` accepts one id or a readonly array, and lowering preserves the shape rather than
      normalising a single id into a one-element sequence.
- [ ] `if` on a job accepts a plain string or a leaf.
- [ ] `strategy.matrix` accepts a map of axis to a list of strings, numbers or booleans, and each
      element emits with its own type, so `[20, 22]` is not quoted.
- [ ] `strategy.fail-fast` is a boolean and `max-parallel` is a number, both emitting unquoted.
- [ ] Jobs accept `name` and `outputs`, with outputs preserving author order.
- [ ] Lowering emits the job fields in GitHub's documented order, so a job's emitted key order does
      not depend on the order the author wrote the object properties.
- [ ] A golden covers a three-job workflow with a needs chain and a two-axis matrix.
- [ ] `pnpm check` passes.
