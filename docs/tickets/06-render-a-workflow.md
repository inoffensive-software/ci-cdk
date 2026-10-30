# 06: Render a workflow

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** A consumer imports `render`, `toDoc`, `workflow`, `job` and `step` from the
provider subpath and gets a valid workflow file for the smallest real workflow: a name, one trigger,
one job with a shell step. This is the first thread through every provider layer, so the module
split, the lowering pass and the barrel all exist and are proven before any vocabulary breadth is
added.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Importing the provider subpath resolves, and the barrel re-exports without declaring anything.
- [ ] `workflow({ name, on, jobs })`, `job({ id, "runs-on", steps })` and `step(...)` return their
      input as a plain readonly struct, with no getters, methods or defaults.
- [ ] `render(workflow)` emits the default header, then `name`, then `on` unquoted, then `jobs` as a
      map keyed by each job's `id`.
- [ ] `id` is used as the map key and is not emitted inside the job body.
- [ ] Jobs emit in array order, so composition by array concat preserves author order.
- [ ] A `run` string is emitted as a literal block scalar, preserving newlines and relative
      indentation.
- [ ] Lowering emits fields in a fixed declared order, so two definitions differing only in property
      order produce identical bytes.
- [ ] `toDoc(workflow)` is exported and returns a `Doc` whose entry order is the declared field
      order, so the lowering stage can be inspected without the emitter.
- [ ] An ADR records that `toDoc` is public provider surface and names the architecture line it
      changes; that section now lists it.
- [ ] A golden is pinned with `toMatchFileSnapshot` for the smallest workflow.
- [ ] `pnpm check` passes, including the boundary rules that keep the provider importing core only.
