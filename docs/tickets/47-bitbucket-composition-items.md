# 47: Composition items, parallel groups and stages

**Spec:** `docs/specs/0007-bitbucket-pipelines-provider.md`

**What to build:** The other three pipeline item forms: `parallel` as a sequence or a
`{ steps, fail-fast }` map, `stage` with a nested `steps:` sequence plus deployment, environment,
condition, trigger and name, and `final` with the options Bitbucket forbids on it removed from the
type. This is the ticket that makes `step:` versus `steps:` a type rather than a memory exercise.

**Blocked by:** 46 (Global sections and reusable definitions)

**Status:** ready-for-agent

- [ ] `parallel(steps)` emits `parallel:` as a sequence; `parallel({ steps, "fail-fast" })` emits the
      map form. A parallel group's children are step items.
- [ ] `stage({ name, deployment, steps })` emits one `stage:` map whose nested sequence is `steps:`,
      never `step:`.
- [ ] `stage` accepts `condition`, `environment` and `trigger`, and `raw` appended after the modelled
      keys.
- [ ] `finalStep(spec)` emits a `final:` item, and `FinalStep` does not accept `deployment`,
      `fail-fast` or `trigger: "manual"`.
- [ ] A stage with no steps is refused at `...stage.steps`.
- [ ] More than one final step, a final step that is not last, and a final step as the only step are
      each refused with the paths the spec's table fixes.
- [ ] `aligent/aligent-graphql-mesh` at commit
      `8095504bbdcd878c3e3e7adf6e48ebf953c01c28` is vendored, its SHA-256
      `eb5de70a1a61c8b93f43610527a5ab27fc8d9e441dd39cabb7eda4b2b9ca1a47` recorded, and the entry
      compares as parsed data; it exercises `custom`, `parallel`, `stage` and pipe variables.
- [ ] The coverage ledger is updated for the new entry, with a reason for every remaining raw path.
- [ ] ADR 0013's export list is extended to name `parallel`, `stage` and `finalStep`, so it describes
      the surface as it now is.
- [ ] `toDoc` structural tests assert the item union emits exactly one key and that a stage's sequence
      is `steps`.
- [ ] Goldens are added or updated deliberately, and an existing golden does not change.
- [ ] `pnpm check` passes.
