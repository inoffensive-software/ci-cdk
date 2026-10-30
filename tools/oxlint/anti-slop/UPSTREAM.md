# Upstream

Vendored source: <https://github.com/dmmulroy/anti-slop>, skill `install-anti-slop` as distributed
via skills.sh (<https://skills.sh/dmmulroy/anti-slop/install-anti-slop>).

- Retrieved: 2026-10-29
- Upstream `HEAD` observed at retrieval: `13909c9e07590f5a85d93c62712259fe14a883f7`
- Content snapshot: SHA-256 over every file in this directory (sorted, excluding this file):
  `439575c387d6e66dc5f4f0743c636250848065e955e3f80af966df1f62fc4274`

The commit is a locator, not proof of what was copied — the skill is distributed as packaged assets,
not as a git checkout, so the observed `HEAD` may not be the revision the assets came from. The
content hash is the authoritative record: recompute it before upgrading to see exactly what changed.

## Deviations

None. All 19 generic rules are enabled at `error` in `.oxlintrc.json`; the opt-in `effect` plugin
under `effect/` is vendored but not registered, because this repository has no direct `effect`
dependency.

The nested `vendor/eslint-stylistic/` files carry their own `UPSTREAM.md` and `LICENSE`; they travel
with `require-readable-spacing` and are not maintained here.

## Upgrading

Follow `references/update.md` in the installed `install-anti-slop` skill. Re-read the diff, recompute
the content hash above, and update this file. Do not edit rules in place — the point of vendoring is
that upgrades are a diff you can read.
