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

| Area                    | Modelled paths                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Corpus entries                                                                                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workflow identity       | `$.name`<br>`$["run-name"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | got, curl-checksrc, anyhow, trpc-main, trpc-release, turbo-lsp, prisma-code-security, mlflow-js, mindee-cron, uv-ai-policy, mise-publish-version |
| Triggers                | `$.on`<br>`$.on.*`<br>`$.on.*.branches`<br>`$.on.*.branches[]`<br>`$.on.*.inputs`<br>`$.on.*.inputs.*`<br>`$.on.*.inputs.*.default`<br>`$.on.*.inputs.*.description`<br>`$.on.*.inputs.*.options`<br>`$.on.*.inputs.*.options[]`<br>`$.on.*.inputs.*.required`<br>`$.on.*.inputs.*.type`<br>`$.on.*.paths`<br>`$.on.*.paths[]`<br>`$.on.*.tags`<br>`$.on.*.tags[]`<br>`$.on.*.types`<br>`$.on.*.types[]`<br>`$.on.*["branches-ignore"]`<br>`$.on.*["branches-ignore"][]`<br>`$.on.*["paths-ignore"]`<br>`$.on.*["paths-ignore"][]`<br>`$.on.*["tags-ignore"]`<br>`$.on.*["tags-ignore"][]`<br>`$.on.*[]`<br>`$.on.*[].cron`<br>`$.on.*[].timezone`<br>`$.on[]`                                                 | got, curl-checksrc, anyhow, trpc-main, trpc-release, turbo-lsp, prisma-code-security, mlflow-js, mindee-cron, uv-ai-policy, mise-publish-version |
| Permissions             | `$.jobs.*.permissions`<br>`$.jobs.*.permissions.*`<br>`$.permissions`<br>`$.permissions.*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | got, curl-checksrc, anyhow, trpc-release, turbo-lsp, prisma-code-security, mlflow-js, uv-ai-policy, mise-publish-version                         |
| Caching                 | `$.jobs.*["cache-mode"]`<br>`$["cache-mode"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | curl-checksrc, mlflow-js                                                                                                                         |
| Workflow env            | `$.env`<br>`$.env.*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | curl-checksrc, anyhow, trpc-release, turbo-lsp                                                                                                   |
| Workflow defaults       | `$.defaults`<br>`$.defaults.run`<br>`$.defaults.run.shell`<br>`$.defaults.run["working-directory"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | mlflow-js                                                                                                                                        |
| Concurrency             | `$.concurrency`<br>`$.concurrency.group`<br>`$.concurrency.queue`<br>`$.concurrency["cancel-in-progress"]`<br>`$.jobs.*.concurrency`<br>`$.jobs.*.concurrency.group`<br>`$.jobs.*.concurrency.queue`<br>`$.jobs.*.concurrency["cancel-in-progress"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                           | curl-checksrc, trpc-main, turbo-lsp, mlflow-js, uv-ai-policy, mise-publish-version                                                               |
| Job body                | `$.jobs`<br>`$.jobs.*`<br>`$.jobs.*.if`<br>`$.jobs.*.name`<br>`$.jobs.*.needs`<br>`$.jobs.*.needs[]`<br>`$.jobs.*.outputs`<br>`$.jobs.*.outputs.*`<br>`$.jobs.*["continue-on-error"]`<br>`$.jobs.*["runs-on"]`<br>`$.jobs.*["runs-on"][]`<br>`$.jobs.*["timeout-minutes"]`                                                                                                                                                                                                                                                                                                                                                                                                                                     | got, curl-checksrc, anyhow, trpc-main, trpc-release, turbo-lsp, prisma-code-security, mlflow-js, mindee-cron, uv-ai-policy, mise-publish-version |
| Reusable-workflow calls | `$.jobs.*.secrets`<br>`$.jobs.*.secrets.*`<br>`$.jobs.*.uses`<br>`$.jobs.*.with`<br>`$.jobs.*.with.*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | anyhow, prisma-code-security, mindee-cron                                                                                                        |
| Environment             | `$.jobs.*.environment`<br>`$.jobs.*.environment.deployment`<br>`$.jobs.*.environment.name`<br>`$.jobs.*.environment.url`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | trpc-release, turbo-lsp, uv-ai-policy                                                                                                            |
| Strategy and matrix     | `$.jobs.*.strategy`<br>`$.jobs.*.strategy.matrix`<br>`$.jobs.*.strategy.matrix.*`<br>`$.jobs.*.strategy.matrix.*[]`<br>`$.jobs.*.strategy.matrix.*[].*`<br>`$.jobs.*.strategy["fail-fast"]`<br>`$.jobs.*.strategy["max-parallel"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | got, anyhow, trpc-main, turbo-lsp, mlflow-js                                                                                                     |
| Steps                   | `$.jobs.*.steps`<br>`$.jobs.*.steps[]`<br>`$.jobs.*.steps[].background`<br>`$.jobs.*.steps[].cancel`<br>`$.jobs.*.steps[].env`<br>`$.jobs.*.steps[].env.*`<br>`$.jobs.*.steps[].id`<br>`$.jobs.*.steps[].if`<br>`$.jobs.*.steps[].name`<br>`$.jobs.*.steps[].parallel`<br>`$.jobs.*.steps[].parallel[]`<br>`$.jobs.*.steps[].parallel[].run`<br>`$.jobs.*.steps[].run`<br>`$.jobs.*.steps[].shell`<br>`$.jobs.*.steps[].uses`<br>`$.jobs.*.steps[].wait`<br>`$.jobs.*.steps[].wait[]`<br>`$.jobs.*.steps[].with`<br>`$.jobs.*.steps[].with.*`<br>`$.jobs.*.steps[]["continue-on-error"]`<br>`$.jobs.*.steps[]["timeout-minutes"]`<br>`$.jobs.*.steps[]["wait-all"]`<br>`$.jobs.*.steps[]["working-directory"]` | got, curl-checksrc, anyhow, trpc-main, trpc-release, turbo-lsp, prisma-code-security, mlflow-js, uv-ai-policy, mise-publish-version              |
| Containers              | `$.jobs.*.container`<br>`$.jobs.*.container.credentials`<br>`$.jobs.*.container.credentials.password`<br>`$.jobs.*.container.credentials.username`<br>`$.jobs.*.container.env`<br>`$.jobs.*.container.env.*`<br>`$.jobs.*.container.image`<br>`$.jobs.*.container.options`<br>`$.jobs.*.container.ports`<br>`$.jobs.*.container.ports[]`<br>`$.jobs.*.container.volumes`<br>`$.jobs.*.container.volumes[]`                                                                                                                                                                                                                                                                                                     | prisma-code-security                                                                                                                             |
| Services                | `$.jobs.*.services`<br>`$.jobs.*.services.*`<br>`$.jobs.*.services.*.credentials`<br>`$.jobs.*.services.*.credentials.password`<br>`$.jobs.*.services.*.credentials.username`<br>`$.jobs.*.services.*.env`<br>`$.jobs.*.services.*.env.*`<br>`$.jobs.*.services.*.image`<br>`$.jobs.*.services.*.options`<br>`$.jobs.*.services.*.ports`<br>`$.jobs.*.services.*.ports[]`<br>`$.jobs.*.services.*.volumes`<br>`$.jobs.*.services.*.volumes[]`                                                                                                                                                                                                                                                                  | trpc-main                                                                                                                                        |
| Job env                 | `$.jobs.*.env`<br>`$.jobs.*.env.*`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | anyhow, trpc-main                                                                                                                                |
| Job defaults            | `$.jobs.*.defaults`<br>`$.jobs.*.defaults.run`<br>`$.jobs.*.defaults.run.shell`<br>`$.jobs.*.defaults.run["working-directory"]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | mlflow-js                                                                                                                                        |

<!-- coverage:end -->

## Documented grammar

[`docs/references/upstream-schemas.md`](../references/upstream-schemas.md) pins the schema this section
reads as a grammar: a gap is a schema path the provider cannot emit, and an overclaim is a modelled
path the schema rejects. `test/corpus/github-actions/documented-grammar.ts` generates the block below
from the walker's paths, `GAPS` and `OVERCLAIMS`; `document.test.ts` compares it with this file, so
editing it by hand fails. The gate and its refresh rule are in
[ADR 0011](../decisions/0011-documented-grammar-gate.md).

<!-- documented-grammar:start -->

154 documented paths. Gaps: 23 (unmodelled 5, out-of-scope 13, schema-noise 5). Overclaims: 1.

| Path                                 | Category       | Reason                                                                                                                                                                                                   |
| ------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$.jobs.*.services.*.command`        | `unmodelled`   | a Docker `CMD` override for one service container, passed as arguments after the image name, and combined with `entrypoint` when both are given                                                          |
| `$.jobs.*.services.*.entrypoint`     | `unmodelled`   | a Docker `ENTRYPOINT` override for one service container, a single executable given as a string                                                                                                          |
| `$.jobs.*.snapshot`                  | `unmodelled`   | asks the job to build a custom runner image from its steps, either as an image name string or as a mapping of `image-name` and an optional `version`                                                     |
| `$.jobs.*.snapshot.version`          | `unmodelled`   | the major version a generated image is built under, a string such as `1` or `1.2`, in the mapping form of `snapshot`                                                                                     |
| `$.jobs.*.snapshot["image-name"]`    | `unmodelled`   | the name a generated image is published under, the required key of the mapping form of `snapshot`                                                                                                        |
| `$.jobs.*.strategy.matrix.*[].*.*`   | `schema-noise` | an object under a key of a matrix cell object; `definitions.configuration` recurses through `additionalProperties`, while GitHub documents cell object keys that hold scalars, one level deep            |
| `$.jobs.*.strategy.matrix.*[].*[]`   | `schema-noise` | an array of cells under a key of a matrix cell object; the array branch of `definitions.configuration`, while GitHub documents those keys with scalar values                                             |
| `$.jobs.*.strategy.matrix.*[][]`     | `schema-noise` | an array whose elements are arrays, one more turn of the recursive `definitions.configuration`; GitHub documents a matrix variable as an array of scalars or of objects                                  |
| `$.jobs.*["runs-on"].group`          | `out-of-scope` | the runner group of the mapping form of `runs-on`; docs/providers/github-actions.md#non-goals rules that form out                                                                                        |
| `$.jobs.*["runs-on"].labels`         | `out-of-scope` | the label list of the mapping form of `runs-on`; the `runs-on` non-goal in docs/providers/github-actions.md#non-goals covers it                                                                          |
| `$.jobs.*["runs-on"].labels[]`       | `out-of-scope` | one label of the mapping form of `runs-on`; the `runs-on` non-goal in docs/providers/github-actions.md#non-goals covers it                                                                               |
| `$.on.*.*`                           | `schema-noise` | `definitions.eventObject` sets `additionalProperties: true`, so the schema accepts any key under any event; GitHub documents only the filters the trigger vocabulary already types                       |
| `$.on.*.inputs.*.deprecationMessage` | `schema-noise` | the schema borrows `deprecationMessage` from the action metadata syntax; the workflow-syntax reference for `on.workflow_dispatch.inputs` documents only description, required, type, default and options |
| `$.on.*.outputs`                     | `out-of-scope` | workflow_call output declarations; docs/providers/github-actions.md#non-goals rules them out                                                                                                             |
| `$.on.*.outputs.*`                   | `out-of-scope` | one workflow_call output under the author's chosen name; the workflow_call outputs non-goal covers it                                                                                                    |
| `$.on.*.outputs.*.description`       | `out-of-scope` | the description of one workflow_call output; the workflow_call outputs non-goal covers it                                                                                                                |
| `$.on.*.outputs.*.value`             | `out-of-scope` | the expression one workflow_call output is mapped to; the workflow_call outputs non-goal covers it                                                                                                       |
| `$.on.*.secrets`                     | `out-of-scope` | workflow_call secret declarations; docs/providers/github-actions.md#non-goals rules them out                                                                                                             |
| `$.on.*.secrets.*`                   | `out-of-scope` | one workflow_call secret under the author's chosen name; the workflow_call secrets non-goal covers it                                                                                                    |
| `$.on.*.secrets.*.description`       | `out-of-scope` | the description of one workflow_call secret; the workflow_call secrets non-goal covers it                                                                                                                |
| `$.on.*.secrets.*.required`          | `out-of-scope` | whether a workflow_call secret must be supplied; the workflow_call secrets non-goal covers it                                                                                                            |
| `$.on.*.workflows`                   | `out-of-scope` | the `workflow_run` filter that lists which workflows may trigger the run; the per-event filters non-goal in docs/providers/github-actions.md#non-goals stops at the configured events                    |
| `$.on.*.workflows[]`                 | `out-of-scope` | one workflow name in the `workflow_run` filter; the per-event filters non-goal in docs/providers/github-actions.md#non-goals covers it                                                                   |

| Path                              | Reason                                                                                                                                                                                                          |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `$.jobs.*.steps[].parallel[].run` | a step's keys inside a `parallel` group; the schema's group items reuse `#/definitions/step`, which the walk has already expanded on this path, so it stops at the group and never enumerates the keys below it |

<!-- documented-grammar:end -->

The overclaim table covers exercised vocabulary only, because the inventory cannot hold an arm the
schema rejects: `image_version` is typed but unproven, so its note stays under Non-goals rather than
appearing here (spec 0005, Further Notes).

## Corpus

Eleven vendored configs, pinned by commit. [`PROVENANCE.md`](../../test/corpus/github-actions/PROVENANCE.md)
is the record for paths, hashes and licences; every entry is compared as data.

| Entry                  | Repository                                    | Commit                                     | Licence           | Comparison | File                                     |
| ---------------------- | --------------------------------------------- | ------------------------------------------ | ----------------- | ---------- | ---------------------------------------- |
| `got`                  | <https://github.com/sindresorhus/got>         | `66d0623ae0bf88a5158e08885e031184f26965c0` | MIT               | data       | `.github/workflows/main.yml`             |
| `curl-checksrc`        | <https://github.com/curl/curl>                | `a4eed8c7f39c1a24f073f5889623b8fb99b50b1a` | curl              | data       | `.github/workflows/checksrc.yml`         |
| `anyhow`               | <https://github.com/dtolnay/anyhow>           | `bb1b0f9af0f645d5fdf1ac63a1fcbf3975ee452c` | MIT OR Apache-2.0 | data       | `.github/workflows/ci.yml`               |
| `trpc-main`            | <https://github.com/trpc/trpc>                | `708753ff1383c47c5f765694978db1000a86ee36` | MIT               | data       | `.github/workflows/main.yml`             |
| `trpc-release`         | <https://github.com/trpc/trpc>                | `708753ff1383c47c5f765694978db1000a86ee36` | MIT               | data       | `.github/workflows/release.yml`          |
| `turbo-lsp`            | <https://github.com/vercel/turborepo>         | `e158e859f804019fa48dd1af15bc247e4759d81e` | MIT               | data       | `.github/workflows/lsp.yml`              |
| `prisma-code-security` | <https://github.com/prisma/prisma>            | `1143e9310013a10c8d7f8a100491e844545320c2` | Apache-2.0        | data       | `.github/workflows/pr-code-security.yml` |
| `mlflow-js`            | <https://github.com/mlflow/mlflow>            | `343f67625336fa4d4b2b83fd77cbade732e7cf19` | Apache-2.0        | data       | `.github/workflows/js.yml`               |
| `mindee-cron`          | <https://github.com/mindee/mindee-api-nodejs> | `4f26fe3f99a7d3ad1f9847bc2b2dfcc1332de0f0` | MIT               | data       | `.github/workflows/cron.yml`             |
| `uv-ai-policy`         | <https://github.com/astral-sh/uv>             | `85b7a374a2f6bda197915f89d32f746143beb315` | MIT OR Apache-2.0 | data       | `.github/workflows/ai-policy.yml`        |
| `mise-publish-version` | <https://github.com/jdx/mise>                 | `ad805190efb10d0467069b8cf1b776ff612f5d24` | MIT               | data       | `.github/workflows/publish-version.yml`  |

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
