# 34: Job fundamentals

**Spec:** `docs/specs/0005-gitlab-ci-breadth.md`

**What to build:** The job fields every real GitLab pipeline uses: `image`, `services`, `before_script`,
`after_script`, `tags`, `extends`, job `variables`, `cache` and `artifacts`. This is the largest
vocabulary ticket; it deletes the majority of the remaining ledger rows.

**Blocked by:** 33 (Global vocabulary and Scalar).

**Status:** ready-for-agent

- [ ] `image` accepts `Text` or `{ name, entrypoint?, pull_policy? }` with the closed pull-policy
      union, and emits both forms.
- [ ] `services` accepts strings and maps (`name`, `alias`, `entrypoint`, `command`, `variables`), in
      author order.
- [ ] `before_script` and `after_script` accept `Script` with the same lowering as `script`; a `ref`
      leaf in any script position keeps its tag.
- [ ] Job `variables` accepts `Record<string, Scalar>`; `tags` accepts a string array; `extends`
      accepts a string or string array and is never resolved.
- [ ] `cache` accepts one cache or an array with string or `key.files`/`prefix` keys, `paths`,
      `policy`, `when`, `fallback_keys` and `untracked`.
- [ ] `artifacts` accepts `paths`, `exclude`, `name`, `expire_in`, `expose_as`, `public`, `when` and
      `reports`, preserving report order.
- [ ] Job emission inserts the new fields at the spec's fixed positions; a golden pins the full body.
- [ ] Job `raw` collides with every new modelled key; no corpus entry uses `raw` for a modelled key.
- [ ] The inventory exercises every new field without `raw`, and the ledger rows they replace are
      deleted.
- [ ] `pnpm check` passes.
