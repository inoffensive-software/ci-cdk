# 48: Step vocabulary breadth

**Spec:** `docs/specs/0007-bitbucket-pipelines-provider.md`

**What to build:** The rest of the step body: image maps, artifacts, `after-script`, caches, services,
conditions, deployment and environment, triggers, size, max-time, runner labels, fail-fast and
concurrency groups. Two more corpus entries land here, and the raw ledger reaches zero across all five.

**Blocked by:** 46 (Global sections and reusable definitions)

**Status:** ready-for-agent

- [ ] `image` accepts a string, `{ name }`, or `{ name, username, password }`; all three emit and
      parse back unchanged.
- [ ] `script` and `after-script` accept the same sequence of strings and pipes.
- [ ] `caches`, `services`, `artifacts` and `runs-on` accept arrays and emit in author order.
- [ ] `condition.state` and `condition.changesets` with `includePaths` or `excludePaths` are typed;
      `changesets` with neither or both is refused at `...condition.changesets`.
- [ ] `size`, `max-time`, `oidc`, `trigger`, `deployment`, `environment`, `fail-fast` and
      `concurrency-group` are typed step fields, and an absent field is not emitted.
- [ ] `BroadbandForum/obuspa` at commit `59028beba21471d19bd3842ef2632ceb6ca8c7fc` (SHA-256
      `0f80bab81faae1e8b58087b4efdd363a9cc6c528e5baff26ed4a1140ddc18afc`) and
      `rairprotocol/rair-dapp` at commit `0afccca0bd38a23e8fc2518cd1fb48612675b607` (SHA-256
      `35fd3f918a635cee9b8ad63526437fd33c9a47ab3f1b6857db620b3433edcebf`) are vendored, hashed and
      compared as parsed data.
- [ ] The coverage ledger is empty for all five entries, and the ledger test asserts that.
- [ ] Goldens are added or updated deliberately, and an existing golden does not change.
- [ ] `pnpm check` passes.
