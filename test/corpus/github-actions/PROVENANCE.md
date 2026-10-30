# Provenance

Every config in this directory is vendored byte for byte from the commit named below. Refreshing an
entry means changing the SHA here and re-running its corpus test; the vendored file itself is never
edited, because a config we had to change is not evidence that we support the original.

## got

- Repo: <https://github.com/sindresorhus/got>
- Commit: `66d0623ae0bf88a5158e08885e031184f26965c0`
- Path: `.github/workflows/main.yml`
- Licence: MIT, Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (<https://sindresorhus.com>)
- Vendored as: `got.yml`, SHA-256
  `51bfb8443fb18b7d7a19971ad09f1fd5145c4f1bf0dc634e9a4a403563889dfb`
- Why this entry: `on` as a sequence, `permissions`, a matrix with numeric axis values, a `name` and
  `runs-on` carrying expressions, and both job and step level keys. It also contains no comments and
  no blank lines, so the format contract can reproduce it exactly.
