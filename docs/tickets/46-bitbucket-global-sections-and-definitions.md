# 46: Global sections and reusable definitions

**Spec:** `docs/specs/0007-bitbucket-pipelines-provider.md`

**What to build:** The global half of the document: typed `options`, `clone`, and `definitions` with
`caches`, `services` and `steps`, so a configuration declares its shared caches, service containers
and step groups once instead of repeating them or writing them through `raw`.

**Blocked by:** 45 (Bitbucket provider tracer)

**Status:** ready-for-agent

- [ ] `options` accepts `docker`, `max-time`, `size` and `runs-on`, and emits only what is set, in the
      spec's order.
- [ ] `clone` accepts `depth` as a number or `"full"`, plus `lfs`, `enabled` and `skip-ssl-verify`;
      `depth: full` and a numeric depth both parse back with the same type they were written with.
- [ ] `definitions.caches` accepts a path string or a `{ path, key: { files } }` map, both emitted by
      name in author order.
- [ ] `definitions.services` accepts `image`, `memory`, `type` and `variables`, emitted in the spec's
      order, with `type` limited to `docker`.
- [ ] `definitions.steps` accepts the same step item a pipeline does.
- [ ] An empty cache or service name is refused with a diagnostic at
      `$.definitions.caches[""]`-style paths.
- [ ] `systemsdk/docker-nginx-php-symfony` at commit
      `da31f3c30607a57f394338ce3b31d8bfc06a320a` is vendored, its SHA-256
      `e5e3bbedb042c62189b66e7da2068766950c1417b2dc87fc698eb28636f3a56e` recorded, and the entry
      compares as parsed data; it is the entry that proves `options` and `definitions.steps`.
- [ ] The coverage ledger is updated for the new entry, with a reason for every remaining raw path.
- [ ] Goldens are added or updated deliberately, and an existing golden does not change.
- [ ] `pnpm check` passes.
