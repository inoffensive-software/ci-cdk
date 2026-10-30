# 40: Job fundamentals

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** The job fields every real GitLab pipeline uses: `image`, `services`, `before_script`,
`after_script`, `tags`, `extends`, job `variables`, `cache` and `artifacts`. This is the largest
vocabulary ticket; it deletes the majority of the remaining ledger rows.

**Blocked by:** 39 (Global vocabulary and Scalar).

**Status:** done

- [x] `image` accepts `Text` or `{ name, entrypoint?, pull_policy? }` with the closed pull-policy
      union, and emits both forms.
- [x] `services` accepts strings and maps (`name`, `alias`, `entrypoint`, `command`, `variables`), in
      author order.
- [x] `before_script` and `after_script` accept `Script` with the same lowering as `script`; a `ref`
      leaf in any script position keeps its tag.
- [x] Job `variables` accepts `Record<string, Scalar>`; `tags` accepts a string array; `extends`
      accepts a string or string array and is never resolved.
- [x] `cache` accepts one cache or an array with string or `key.files`/`prefix` keys, `paths`,
      `policy`, `when`, `fallback_keys` and `untracked`.
- [x] `artifacts` accepts `paths`, `exclude`, `name`, `expire_in`, `expose_as`, `public`, `when` and
      `reports`, preserving report order.
- [x] Job emission inserts the new fields at the spec's fixed positions; a golden pins the full body.
- [x] Job `raw` collides with every new modelled key; no corpus entry uses `raw` for a modelled key.
- [x] The inventory exercises every new field without `raw`, and the ledger rows they replace are
      deleted.
- [x] `pnpm check` passes.
