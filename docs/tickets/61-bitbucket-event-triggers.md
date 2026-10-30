# 61: Event triggers

**Spec:** `docs/specs/0008-bitbucket-grammar-completion.md`

**What to build:** The top-level `triggers:` map, so an event in one pipeline can start another by name, with a typed condition and pipeline list.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `Triggers` is an author-keyed record of trigger types to lists of `{ condition, pipelines }`; trigger types stay open because Bitbucket's documented list is wider than any one config.
- [ ] `triggers` emits after `pipelines` and before `raw`; each entry emits `condition` then `pipelines`.
- [ ] An empty trigger list, an entry with an empty condition, or an entry with no pipeline names is refused with a diagnostic at the entry's path.
- [ ] `alibaba/open-code-review` at `476f661f26e5576a36003abe7a37d5ff8546b2df` (Apache-2.0, 10666 bytes, 264 lines, SHA-256 `a86615388514cb55322d530fe1553b0f108a8317e4611a52ec568966a4fba032`) is vendored and compares as parsed data.
- [ ] `Vardot/ddev-dev-tools` at `515f6901367458f75ee4956f8172e8566d7879f7` (Apache-2.0, 8216 bytes, 163 lines, SHA-256 `f0ca7e778d8dc647a6b72d8eac626a4909258f680ecfe5c01be3d77713a94f8e`) is vendored and compares as parsed data; PROVENANCE records that both trigger fixtures are repository example files.
- [ ] Inventory, exhaustiveness gate and documented-grammar lists are re-derived; the stale-row check is empty.
- [ ] `labels` remains out of scope and declared.
- [ ] Goldens are added; no existing golden changes.
- [ ] `pnpm check` passes.
