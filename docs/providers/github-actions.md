# GitHub Actions

## Scope

The provider behind the `@inoffensive/ci-cdk/github-actions` subpath export, built from
`src/github-actions/` to `dist/github-actions/`. It emits workflow YAML for the files a repository
keeps under `.github/workflows/`.

It owns `index.ts` (the barrel), `render.ts`, `types.ts`, `leaves.ts`, `to-doc.ts`, `on-doc.ts`,
`validate.ts`, `trigger.ts`, their colocated tests and the goldens in `src/github-actions/__snapshots__/`.
The layers, the public surface and the emitted format are described once in
[`docs/architecture.md`](../architecture.md); this file does not repeat them.

## Coverage

The claim is the corpus, and the corpus is asserted by three tests:

- [`corpus.test.ts`](../../test/corpus/github-actions/corpus.test.ts) renders each entry and compares
  it with the pinned file as parsed data.
- [`exhaustiveness.test.ts`](../../test/corpus/github-actions/exhaustiveness.test.ts) holds the
  modelled set to the corpus keys and the ledger in both directions.
- [`coverage.test.ts`](../../test/corpus/github-actions/coverage.test.ts) holds the ledger to the
  fixtures' `raw` usage.

The table below is generated from the inventory's modelled key paths and the entries' corpus paths by
`test/corpus/github-actions/coverage-table.ts`. `document.test.ts` compares it with this file, so
editing it by hand fails.

<!-- coverage:start -->

| Area                    | Modelled paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Corpus entries                                                        |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Workflow identity       | `$.name`<br>`$["run-name"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | got, anyhow, trpc-main, trpc-release, turbo-lsp, prisma-code-security |
| Triggers                | `$.on`<br>`$.on.*`<br>`$.on.*.branches`<br>`$.on.*.branches[]`<br>`$.on.*.inputs`<br>`$.on.*.inputs.*`<br>`$.on.*.inputs.*.default`<br>`$.on.*.inputs.*.description`<br>`$.on.*.inputs.*.options`<br>`$.on.*.inputs.*.options[]`<br>`$.on.*.inputs.*.required`<br>`$.on.*.inputs.*.type`<br>`$.on.*.paths`<br>`$.on.*.paths[]`<br>`$.on.*.tags`<br>`$.on.*.tags[]`<br>`$.on.*.types`<br>`$.on.*.types[]`<br>`$.on.*["branches-ignore"]`<br>`$.on.*["branches-ignore"][]`<br>`$.on.*["paths-ignore"]`<br>`$.on.*["paths-ignore"][]`<br>`$.on.*["tags-ignore"]`<br>`$.on.*["tags-ignore"][]`<br>`$.on.*[]`<br>`$.on.*[].cron`<br>`$.on[]` | got, anyhow, trpc-main, trpc-release, turbo-lsp, prisma-code-security |
| Permissions             | `$.jobs.*.permissions`<br>`$.jobs.*.permissions.*`<br>`$.permissions`<br>`$.permissions.*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | got, anyhow, trpc-release, turbo-lsp, prisma-code-security            |
| Workflow env            | `$.env`<br>`$.env.*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | anyhow, trpc-release, turbo-lsp                                       |
| Workflow defaults       | `$.defaults`<br>`$.defaults.run`<br>`$.defaults.run.shell`<br>`$.defaults.run["working-directory"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | —                                                                     |
| Concurrency             | `$.concurrency`<br>`$.concurrency.group`<br>`$.concurrency["cancel-in-progress"]`<br>`$.jobs.*.concurrency`<br>`$.jobs.*.concurrency.group`<br>`$.jobs.*.concurrency["cancel-in-progress"]`                                                                                                                                                                                                                                                                                                                                                                                                                                             | trpc-main, turbo-lsp                                                  |
| Job body                | `$.jobs`<br>`$.jobs.*`<br>`$.jobs.*.if`<br>`$.jobs.*.name`<br>`$.jobs.*.needs`<br>`$.jobs.*.needs[]`<br>`$.jobs.*.outputs`<br>`$.jobs.*.outputs.*`<br>`$.jobs.*["continue-on-error"]`<br>`$.jobs.*["runs-on"]`<br>`$.jobs.*["runs-on"][]`<br>`$.jobs.*["timeout-minutes"]`                                                                                                                                                                                                                                                                                                                                                              | got, anyhow, trpc-main, trpc-release, turbo-lsp, prisma-code-security |
| Reusable-workflow calls | `$.jobs.*.secrets`<br>`$.jobs.*.secrets.*`<br>`$.jobs.*.uses`<br>`$.jobs.*.with`<br>`$.jobs.*.with.*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | anyhow, prisma-code-security                                          |
| Environment             | `$.jobs.*.environment`<br>`$.jobs.*.environment.name`<br>`$.jobs.*.environment.url`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | trpc-release, turbo-lsp                                               |
| Strategy and matrix     | `$.jobs.*.strategy`<br>`$.jobs.*.strategy.matrix`<br>`$.jobs.*.strategy.matrix.*`<br>`$.jobs.*.strategy.matrix.*[]`<br>`$.jobs.*.strategy.matrix.*[].*`<br>`$.jobs.*.strategy["fail-fast"]`<br>`$.jobs.*.strategy["max-parallel"]`                                                                                                                                                                                                                                                                                                                                                                                                      | got, anyhow, trpc-main, turbo-lsp                                     |
| Steps                   | `$.jobs.*.steps`<br>`$.jobs.*.steps[]`<br>`$.jobs.*.steps[].env`<br>`$.jobs.*.steps[].env.*`<br>`$.jobs.*.steps[].id`<br>`$.jobs.*.steps[].if`<br>`$.jobs.*.steps[].name`<br>`$.jobs.*.steps[].run`<br>`$.jobs.*.steps[].shell`<br>`$.jobs.*.steps[].uses`<br>`$.jobs.*.steps[].with`<br>`$.jobs.*.steps[].with.*`<br>`$.jobs.*.steps[]["continue-on-error"]`<br>`$.jobs.*.steps[]["timeout-minutes"]`<br>`$.jobs.*.steps[]["working-directory"]`                                                                                                                                                                                       | got, anyhow, trpc-main, trpc-release, turbo-lsp, prisma-code-security |
| Containers              | `$.jobs.*.container`<br>`$.jobs.*.container.credentials`<br>`$.jobs.*.container.credentials.password`<br>`$.jobs.*.container.credentials.username`<br>`$.jobs.*.container.env`<br>`$.jobs.*.container.env.*`<br>`$.jobs.*.container.image`<br>`$.jobs.*.container.options`<br>`$.jobs.*.container.ports`<br>`$.jobs.*.container.ports[]`<br>`$.jobs.*.container.volumes`<br>`$.jobs.*.container.volumes[]`                                                                                                                                                                                                                              | prisma-code-security                                                  |
| Services                | `$.jobs.*.services`<br>`$.jobs.*.services.*`<br>`$.jobs.*.services.*.credentials`<br>`$.jobs.*.services.*.credentials.password`<br>`$.jobs.*.services.*.credentials.username`<br>`$.jobs.*.services.*.env`<br>`$.jobs.*.services.*.env.*`<br>`$.jobs.*.services.*.image`<br>`$.jobs.*.services.*.options`<br>`$.jobs.*.services.*.ports`<br>`$.jobs.*.services.*.ports[]`<br>`$.jobs.*.services.*.volumes`<br>`$.jobs.*.services.*.volumes[]`                                                                                                                                                                                           | trpc-main                                                             |
| Job env                 | `$.jobs.*.env`<br>`$.jobs.*.env.*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | anyhow, trpc-main                                                     |
| Job defaults            | `$.jobs.*.defaults`<br>`$.jobs.*.defaults.run`<br>`$.jobs.*.defaults.run.shell`<br>`$.jobs.*.defaults.run["working-directory"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | —                                                                     |

<!-- coverage:end -->

## Corpus

Six vendored configs, pinned by commit. [`PROVENANCE.md`](../../test/corpus/github-actions/PROVENANCE.md)
is the record for paths, hashes and licences; every entry is compared as data.

| Entry                  | Repository                            | Commit                                     | Licence           | Comparison | File                                     |
| ---------------------- | ------------------------------------- | ------------------------------------------ | ----------------- | ---------- | ---------------------------------------- |
| `got`                  | <https://github.com/sindresorhus/got> | `66d0623ae0bf88a5158e08885e031184f26965c0` | MIT               | data       | `.github/workflows/main.yml`             |
| `anyhow`               | <https://github.com/dtolnay/anyhow>   | `bb1b0f9af0f645d5fdf1ac63a1fcbf3975ee452c` | MIT OR Apache-2.0 | data       | `.github/workflows/ci.yml`               |
| `trpc-main`            | <https://github.com/trpc/trpc>        | `708753ff1383c47c5f765694978db1000a86ee36` | MIT               | data       | `.github/workflows/main.yml`             |
| `trpc-release`         | <https://github.com/trpc/trpc>        | `708753ff1383c47c5f765694978db1000a86ee36` | MIT               | data       | `.github/workflows/release.yml`          |
| `turbo-lsp`            | <https://github.com/vercel/turborepo> | `e158e859f804019fa48dd1af15bc247e4759d81e` | MIT               | data       | `.github/workflows/lsp.yml`              |
| `prisma-code-security` | <https://github.com/prisma/prisma>    | `1143e9310013a10c8d7f8a100491e844545320c2` | Apache-2.0        | data       | `.github/workflows/pr-code-security.yml` |

## Quirks

- **`on` is a key.** YAML 1.1 would read a bare `on` as boolean true; the `yaml` package this
  repository emits with treats it as the string key GitHub expects, so it is written plainly as
  `on:`. The corpus comparison parses it back the same way, so an `on:` key never becomes `true`.
- **A bare event lowers to `null`.** `on: { push: {} }` emits `push: null`, which is the value a bare
  `push:` parses to. See [ADR 0006](../decisions/0006-bare-event-emits-null.md).
- **`strategy` precedes the job body.** It is emitted directly after `runs-on`, ahead of `steps` and
  the rest, because the pinned corpus writes it there. See
  [ADR 0004](../decisions/0004-corpus-key-order-wins.md).
- **The corpus compares data, not bytes.** Key order, quoting, block versus flow collections, blank
  lines and comments are outside the claim; values, nesting and scalar types are inside it. See
  [ADR 0005](../decisions/0005-corpus-compares-data.md) and
  [ADR 0007](../decisions/0007-corpus-compares-data-only.md).
- **A string that spells a number stays a string.** `ports: [8080, "9090"]` emits `9090` quoted, so
  it parses back as text. See [ADR 0010](../decisions/0010-string-and-number-are-distinct-at-the-boundary.md).

## Non-goals

- Matrix `include` and `exclude`.
- `workflow_call` outputs and secrets.
- `runs-on` as `{ group, labels }`.
- Per-event filters beyond the events the trigger vocabulary configures.
- Expression parsing: `expr` is text interpolation, and conditions are never evaluated.
- The `image_version` trigger is typed but unproven: no corpus entry uses it, and the vendored
  schema does not recognise it.

Keys outside the vocabulary can still be written through `raw` where a struct exposes it; a corpus
key that needs `raw` is a ledger row.

## Open gaps

<!-- open-gaps:start -->

None. The coverage ledger is empty: every corpus key is modelled.

<!-- open-gaps:end -->
