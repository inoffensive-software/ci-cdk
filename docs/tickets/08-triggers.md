# 08: Triggers

**Spec:** `docs/specs/0002-github-actions-provider.md`

**What to build:** The `on` field expresses all three shapes GitHub accepts: one event name, several
event names, or a map of event to options. A monorepo filter, a nightly cron and a typed manual
trigger all read like the GitHub documentation.

**Blocked by:** 06 (Render a workflow)

**Status:** done

- [x] `on` accepts a single event name, a readonly array of event names, or a triggers object.
- [x] Event names are a closed union of the documented events; an unknown name is rejected at
      typecheck, proven by a negative type test rather than prose.
- [x] `push` and `pull_request` accept `branches`, `branches-ignore`, `paths`, `paths-ignore`, `tags`,
      `tags-ignore` and `types` as arrays, spelled exactly as GitHub spells them.
- [x] `schedule` accepts a list of cron entries.
- [x] `workflow_dispatch` accepts typed inputs: `type` limited to string, boolean, choice and
      environment, plus `description`, `required` and `default`, and `options` for choice inputs.
- [x] `workflow_call` is expressible as a bare event name.
- [x] An event with no options emits as an empty map, not as a null or a blank key.
- [x] Trigger option order follows author order.
- [x] A golden covers a triggers map with a branch filter, a cron entry and a dispatch input.
- [x] `pnpm check` passes.
