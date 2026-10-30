# Spec 0007: The Bitbucket Pipelines provider

Status: ready-for-agent
Covers: the third provider, in the order the decisions table settles: GitHub Actions, then GitLab,
then Bitbucket. It is a full provider in one slice: tracer path, corpus breadth, vendored schema,
documented-grammar gate, format lock and provider page.
Respects: ADR 0001, ADR 0002, ADR 0003, ADR 0005, ADR 0008, ADR 0010, ADR 0011, specs 0001-0006.
Adds: ADR 0013 (the Bitbucket public surface).

## Problem Statement

`@inoffensive/ci-cdk` ships two providers. The README marks Bitbucket Pipelines as planned, the
package has no `bitbucket-pipelines` subpath, and `docs/references/upstream-schemas.md` already names
Atlassian's schema as the third syntax oracle. A consumer on Bitbucket writes `bitbucket-pipelines.yml`
by hand and finds out at pipeline creation that a step has no `script`, that two branch pipelines
claim the same pattern, that a `final` step is not last, or that a stage is empty.

Bitbucket is also the wrong provider to assume into the template. Its document root is an unordered
map of trigger sections rather than a job map, its pipeline items are tagged unions (`step`,
`parallel`, `stage`, `final`) rather than steps, a step's `script` is a sequence whose items are
commands **or pipes**, and the same word names two different nodes: `step:` is one item, `steps:` is a
stage's sequence. Two providers could not falsify the claim that `Doc` is a superset of provider
needs; a third with a different root and a struct inside a sequence can.

There is one more gap the first two providers opened and Bitbucket can close by construction. The
schema conformance suite discovers providers by the presence of a vendored schema, and the
documented-grammar walker from spec 0005 is shared test support. Bitbucket should arrive already
measured: schema-vendored, gate-covered, and with its gaps declared rather than described.

## Solution

Ship the Bitbucket Pipelines provider end to end.

- A provider module behind `@inoffensive/ci-cdk/bitbucket-pipelines` with the same two-function
  surface as the other providers: `render(pipelineConfig(...))` for consumers, `toDoc` for provider
  authors. No leaf constructors: `${VAR}` is plain text, and a pipe is a struct, not a styled scalar.
- Vocabulary for the document root, the five trigger sections, the four pipeline item forms, the
  step body, and the three reusable definitions. Everything else is written through `raw` at the
  document, step or stage level.
- Document-level validation for the mistakes only a whole document can see: duplicate selector
  patterns and custom names, empty pipelines, misplaced or repeated `final` steps, empty stages,
  empty scripts, malformed `condition.changesets`, and raw keys that collide with modelled ones.
- Five pinned real configurations, compared as parsed data, whose combined raw ledger reaches zero.
  They are chosen for distinct shapes: a Bitbucket-hosted release pipeline, a stage/parallel/custom
  monorepo, a self-hosted-runner build, a changeset-conditioned pipeline, and a tag/branch matrix.
- Atlassian's official schema vendored and wired into the existing conformance suite, so emitted
  documents are checked against the provider's own grammar.
- A modelled-path inventory and an exhaustiveness gate, reusing the shared corpus helpers, so
  "supported" is a test verdict.
- The documented-grammar diff from spec 0005 applied to Bitbucket, with gaps and overclaims declared
  and categorised.
- A generated provider page, a format lock, and ADR 0013.

After this, a consumer can write a realistic Bitbucket pipeline with typed images, clones, options,
definitions, all five trigger sections, parallel groups, stages, final steps, pipes, artifacts,
services, caches, conditions and runner selection, and the suite fails when the vocabulary and the
corpus drift.

## User Stories

1. As a library consumer, I want to import `render`, `pipelineConfig`, `step`, `parallel`, `stage`,
   `finalStep` and `pipe` from `@inoffensive/ci-cdk/bitbucket-pipelines`, so that the provider exists
   at the subpath the README promises.

2. As a library consumer, I want `render(pipelineConfig(...))` to return the file's text and leave
   writing it to me, so that path selection and dry runs stay my decision.

3. As a library consumer, I want `render` to accept the same `{ header }` option as the other
   providers, so that suppressing the generated header needs no Bitbucket-specific knowledge.

4. As a library consumer, I want `pipelineConfig({ image, pipelines })` to return a plain readonly
   struct, so that I can compose configurations with object spread.

5. As a library consumer, I want the root keys Bitbucket documents as global settings (`image`,
   `options`, `clone`, `definitions`) to be typed fields in the order the emitted file uses, so that
   two definitions with the same data emit the same bytes.

6. As a library consumer, I want `options` to accept `docker`, `max-time`, `size` and `runs-on`, so
   that a global setting is not restated on every step.

7. As a library consumer, I want `clone` to accept `depth` as a number or `"full"`, plus `lfs`,
   `enabled` and `skip-ssl-verify`, so that shallow and skipped clones are expressible.

8. As a library consumer, I want `image` to accept a string or a `name`/`username`/`password` map, so
   that a private registry is typed.

9. As a library consumer, I want `definitions.caches` to accept a path string or a `path` map, and a
   cache key built from `files`, so that dependency caches are reusable by name.

10. As a library consumer, I want `definitions.services` to accept `image`, `memory`, `type` and
    `variables`, so that a database or Docker service is typed rather than raw.

11. As a library consumer, I want `definitions.steps` to accept the same step item as a pipeline, so
    that a shared step group is expressible as data.

12. As a library consumer, I want `pipelines.default` to accept an ordered list of items, so that the
    default pipeline is an ordinary array literal.

13. As a library consumer, I want `branches`, `tags` and `pull-requests` to accept an ordered list of
    `{ pattern, pipeline }` entries, so that selector patterns keep their author order and duplicate
    patterns are detectable.

14. As a library consumer, I want `custom` to accept an ordered list of `{ name, pipeline }` entries,
    so that manually triggered pipelines are named exactly as Bitbucket shows them.

15. As a library consumer, I want `step(spec)` to produce a `step:` item, so that the singular key is
    written once and the `step` versus `steps` confusion is a type, not a memory exercise.

16. As a library consumer, I want `parallel(...)` to produce a `parallel:` item from steps or from a
    `{ steps, fail-fast }` map, so that concurrent steps are an array literal.

17. As a library consumer, I want `stage({ name, deployment, steps })` to produce a `stage:` item
    whose nested sequence is `steps:`, so that the plural key appears only where Bitbucket wants it.

18. As a library consumer, I want `finalStep(spec)` to produce a `final:` item and be refused by
    validation unless it is last and alone, so that cleanup steps cannot be silently skipped.

19. As a library consumer, I want a step's `script` to be a sequence of strings and pipes, so that a
    command and a pipe are the same list and compose by concat.

20. As a library consumer, I want `pipe(id, variables)` to produce a pipe whose variables are strings
    or string lists, so that a pipe call is typed without a leaf.

21. As a library consumer, I want `after-script` to accept the same sequence shape as `script`, so
    that teardown composes the same way.

22. As a library consumer, I want `caches` and `services` to accept arrays of definition names, so
    that a step selects from `definitions` without repeating the body.

23. As a library consumer, I want `artifacts` to accept glob paths, so that the common form is an
    array literal.

24. As a library consumer, I want `condition.changesets` to accept `includePaths` or `excludePaths`
    but not both, so that a conditional step is a type error instead of a silent runtime surprise.

25. As a library consumer, I want `condition.state` to accept a text expression, so that a boolean
    condition is expressible without raw.

26. As a library consumer, I want `size`, `max-time`, `runs-on`, `oidc`, `trigger`, `deployment`,
    `environment`, `fail-fast` and `concurrency-group` to be typed step fields, so that runner
    selection and resource settings are not raw.

27. As a library consumer, I want an absent field never emitted, so that adding vocabulary does not
    add empty keys to my file.

28. As a library consumer, I want unmodelled keys written through `raw` at the document, step and
    stage level, so that a real config is expressible before its whole grammar is modelled.

29. As a library consumer, I want raw entries appended after the modelled keys at their own level, and
    a raw key that collides with a modelled one refused with a diagnostic, so that no document
    silently carries the same key twice.

30. As a library consumer, I want duplicate selector patterns, duplicate custom names, empty patterns
    and empty custom names refused, so that a last-wins map entry cannot delete a pipeline.

31. As a library consumer, I want a pipeline with no items refused, so that an empty `default:` is
    caught before the file is written.

32. As a library consumer, I want a stage with no steps and a step with an empty script refused, so
    that a pipeline that cannot run is caught early.

33. As a library consumer, I want every diagnostic to carry the path I would use to find the problem
    (`$.pipelines.branches[1].pattern`, `$.pipelines.default[0].step.script`), so that a failure in a
    shared definition points at the value I wrote.

34. As a library consumer, I want all document diagnostics reported in one throw, so that fixing a
    configuration is one pass rather than one error per run.

35. As a provider author, I want `toDoc` exported, so that I can inspect the tree before rendering
    and debug key order without parsing the emitted text.

36. As a provider author, I want the Bitbucket provider to import only core, so that the three
    providers stay independent and the boundary rules keep holding.

37. As a maintainer, I want five pinned real Bitbucket configurations reproduced as parsed data, so
    that "supports Bitbucket Pipelines" has a measurable meaning.

38. As a maintainer, I want every raw path those fixtures need declared with a reason, so that the
    ledger is an honest to-do list and reaches empty at the end of the slice.

39. As a maintainer, I want a modelled-path inventory that exercises every modelled key and never
    uses raw, so that "modelled" is a rendered key-path union rather than a claim.

40. As a maintainer, I want an exhaustiveness gate that fails when a corpus key is neither modelled
    nor declared, when a declared row is unused, and when a modelled key is written through raw, so
    that coverage cannot silently regress.

41. As a maintainer, I want emitted inventory and corpus documents validated against Atlassian's
    vendored schema, so that the types and the provider's own grammar agree.

42. As a maintainer, I want the schema pinned by copy date and hash, so that upstream churn cannot
    break the build and refreshing is a deliberate change.

43. As a maintainer, I want the schema walked into key paths and diffed against the modelled set, so
    that "what can Bitbucket write that we cannot" is a list with a size.

44. As a maintainer, I want every gap categorised as `unmodelled`, `out-of-scope` or `schema-noise`,
    so that only the first is debt and the other two are decisions.

45. As a maintainer, I want modelled paths the schema does not describe reported as overclaims, so
    that a stale schema and a provider bug are both visible. `definitions.steps` is the first: it is
    documented and universally used, and the pinned schema does not define it.

46. As a maintainer, I want refusal of a raw key the schema also rejects proved by a negative fixture,
    so that the conformance suite is known to be checking something.

47. As a maintainer, I want the emitted format frozen by goldens, including `"*"` and `"**"` selector
    quoting, the `step:`/`steps:` distinction and a pipe inside a script sequence, so that a
    serializer change cannot alter consumer files silently.

48. As a consumer, I want the provider page to show corpus coverage, quirks, non-goals, open gaps and
    documented-grammar coverage, so that the claim and its debt are one artefact.

49. As a maintainer, I want ADR 0013 to record the Bitbucket public surface and why the document type
    is not called `Pipeline`, so that the next widening is a deliberate decision.

## Implementation Decisions

### Modules and public surface

- A new provider module named `bitbucket-pipelines` is the third stage's third implementation. It
  contains `types`, `to-doc`, `validate`, `render` and `index`, mirrored from the other providers.
- It has no `leaves`, `on-doc` or `trigger` module. Bitbucket's `${VAR}` is plain text and `${{ }}`
  YAML templating is pass-through text; a pipe is a struct, not a leaf.
- `index` re-exports `render`, `toDoc`, the builders `pipelineConfig`, `step`, `parallel`, `stage`,
  `finalStep`, `pipe`, and the types `PipelineConfig`, `Step`, `PipelineItem`, `ScriptItem` and the
  rest of the struct types. Nothing else in the module is importable by consumers.
- The package's `./bitbucket-pipelines` subpath export and the provider's zone in the boundary
  configuration are part of the slice, so `pnpm check` compiles and checks the queue.
- Core is unchanged. No new runtime dependency is added; `yaml` stays pinned exactly.
- ADR 0013 records the surface, cites ADR 0003 and ADR 0008, records that the provider exports no
  leaves, and records that the document type is `PipelineConfig` because Bitbucket uses "pipeline" for
  each triggered entry as well as for the file. It is written with the tracer and extended when the
  item builders land, so it always describes the exports that exist.

### Structs

```ts
export type ScriptItem = Text | Pipe;

export type PipelineItem = StepItem | ParallelItem | StageItem | FinalItem;

export interface PipelineConfig {
  readonly image?: Text | Image;
  readonly options?: Options;
  readonly clone?: Clone;
  readonly definitions?: Definitions;
  readonly pipelines: Pipelines;
  readonly raw?: Readonly<Record<string, Value>>;
}

export interface Pipelines {
  readonly default?: readonly PipelineItem[];
  readonly branches?: readonly SelectorPipeline[];
  readonly tags?: readonly SelectorPipeline[];
  readonly "pull-requests"?: readonly SelectorPipeline[];
  readonly custom?: readonly NamedPipeline[];
}

export interface SelectorPipeline {
  readonly pattern: string;
  readonly pipeline: readonly PipelineItem[];
}

export interface NamedPipeline {
  readonly name: string;
  readonly pipeline: readonly PipelineItem[];
}

export interface StepItem {
  readonly step: Step;
}

export interface Pipe {
  readonly pipe: Text;
  readonly variables?: Readonly<Record<string, Text | readonly Text[]>>;
}
```

- Builders are near-identity inference anchors: `pipelineConfig`, `step`, `parallel`, `stage`,
  `finalStep` and `pipe` return their input, typed, and never validate or merge.
- `Step` fields keep Bitbucket's own spelling, quoted where needed: `"after-script"`, `"max-time"`,
  `"runs-on"`, `"fail-fast"`, `"concurrency-group"`, `"skip-ssl-verify"`.
- `FinalStep` is `Omit<Step, "deployment" | "fail-fast">` with `trigger?: "automatic"`, so the two
  options Bitbucket forbids on a final step are not expressible.
- `Definition` maps are records keyed by author-chosen names. Nothing else is a record; pipelines are
  arrays so order survives and duplicates are detectable.

### Shapes

| Field         | Accepted shape                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `image`       | `Text`, or `{ name: Text }`, or `{ name: Text; username: Text; password: Text }`                                                                                                                                                     |
| `options`     | `{ docker?: boolean; "max-time"?: number; size?: Size; "runs-on"?: readonly Text[] }`                                                                                                                                                |
| `clone`       | `{ depth?: number \| "full"; lfs?: boolean; enabled?: boolean; "skip-ssl-verify"?: boolean }`                                                                                                                                        |
| `definitions` | `{ caches?: Record<string, Cache>; services?: Record<string, Service>; steps?: readonly StepItem[] }`                                                                                                                                |
| `Cache`       | `Text`, or `{ path: Text; key?: { files: readonly string[] } }`                                                                                                                                                                      |
| `Service`     | `{ image?: Text \| Image; memory?: number; type?: "docker"; variables?: Record<string, Text> }`                                                                                                                                      |
| `step` body   | `name`, `image`, `clone`, `"after-script"`, `artifacts`, `caches`, `condition`, `"concurrency-group"`, `deployment`, `environment`, `"fail-fast"`, `"max-time"`, `oidc`, `"runs-on"`, `script`, `services`, `size`, `trigger`, `raw` |
| `script`      | `readonly ScriptItem[]`; `after-script` takes the same shape                                                                                                                                                                         |
| `pipe`        | `{ pipe: Text; variables?: Record<string, Text \| readonly Text[]> }`                                                                                                                                                                |
| `caches`      | `readonly Text[]`; names reference `definitions.caches` and are never checked, because the corpus may rely on workspace defaults                                                                                                     |
| `services`    | `readonly Text[]`; names reference `definitions.services` and are never checked                                                                                                                                                      |
| `artifacts`   | `readonly string[]`                                                                                                                                                                                                                  |
| `"runs-on"`   | `readonly Text[]`                                                                                                                                                                                                                    |
| `condition`   | `{ state?: Text; changesets?: { includePaths: readonly string[] } \| { excludePaths: readonly string[] } }`                                                                                                                          |
| `stage`       | `{ name?: Text; deployment?: Text; environment?: Text; trigger?: Trigger; condition?: Condition; steps: readonly StepItem[]; raw?: Record<string, Value> }`                                                                          |
| `parallel`    | `readonly StepItem[]`, or `{ steps: readonly StepItem[]; "fail-fast"?: boolean }`                                                                                                                                                    |
| `Size`        | `"1x" \| "2x" \| "4x" \| "8x" \| "16x" \| "24x" \| "32x"`                                                                                                                                                                            |
| `Trigger`     | `"automatic" \| "manual"`                                                                                                                                                                                                            |

`Text` is core's `string | LeafNode`; `Value` is core's boundary type. A leaf produced by any provider
still lowers correctly through `fromValue`.

### Emission order

Order is fixed and presentation-only. Bitbucket's own schema lists step properties alphabetically, so
every level is emitted in the schema's order and `raw` last. A key's position is then derivable
rather than remembered, and a new field slots in without renumbering a golden.

- Document: `clone`, `definitions`, `image`, `options`, `pipelines`, then `raw`.
- Definitions: `caches`, `services`, `steps`; entries within the two records in author order.
- Cache: `path`, `key`; key: `files`.
- Service: `image`, `memory`, `type`, `variables`.
- Options: `docker`, `max-time`, `runs-on`, `size`.
- Clone: `depth`, `enabled`, `lfs`, `skip-ssl-verify`.
- Pipelines: `default`, `branches`, `tags`, `pull-requests`, `custom`; entries in array order.
- Stage: `condition`, `deployment`, `environment`, `name`, `steps`, `trigger`, then `raw`.
- Step: `after-script`, `artifacts`, `caches`, `clone`, `condition`, `concurrency-group`, `deployment`,
  `environment`, `fail-fast`, `image`, `max-time`, `name`, `oidc`, `runs-on`, `script`, `services`,
  `size`, `trigger`, then `raw`.
- Parallel map: `fail-fast`, `steps`.
- Pipe: `pipe`, `variables`; condition: `changesets`, `state`.

Within `variables` maps, insertion order is preserved.

### Quirks the provider must encode

- `step:` is one pipeline item and `steps:` is a stage or parallel group's sequence. The item builders
  make the distinction a type; a `stage`'s nested sequence is always `steps`.
- A pipe is an element of `script` or `after-script`, not a step property: the sequence mixes strings
  and `{ pipe, variables }` maps.
- `pull-requests` is a hyphenated root key, and selector patterns such as `*` and `**` are plain
  scalars that must survive a parse as those strings. The serializer quotes them; a golden pins it.
- `clone.depth` is a number or the string `full`; `size` is a string such as `2x`; neither becomes a
  number at the boundary.
- A `final` step is an item form, not a step property, and is only valid last.
- `definitions.steps` is documented and used by every real config, and the pinned schema does not
  describe it. It is modelled, and the documented-grammar report declares it as an overclaim.

### Diagnostics

`toDoc` is the only place that validates and the only place that throws. `validate` collects every
problem; `toDoc` throws one `DiagnosticError` carrying all of them. Paths use core's notation and
walk through the item wrapper, so a step field reads `$.pipelines.default[0].step.script`.

| Condition                                | Path                                               | Message shape                                             |
| ---------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| `pipelines` declares no section          | `$.pipelines`                                      | `pipelines must declare at least one pipeline`            |
| Empty pipeline (any section)             | `$.pipelines.default` or `...branches[i].pipeline` | `pipeline must contain at least one item`                 |
| Empty selector pattern                   | `$.pipelines.branches[i].pattern`                  | `pattern must not be empty`                               |
| Duplicate selector pattern in a section  | the later `...pattern`                             | `duplicate pattern "main": two pipelines for one branch`  |
| Empty custom name                        | `$.pipelines.custom[i].name`                       | `custom pipeline name must not be empty`                  |
| Duplicate custom name                    | the later `...name`                                | `duplicate custom pipeline "deploy": ...`                 |
| Stage with no steps                      | `...stage.steps`                                   | `stage must contain at least one step`                    |
| More than one final step in a pipeline   | each `...final` after the first                    | `a pipeline allows one final step`                        |
| Final step not last                      | the final item's path                              | `the final step must be the last item`                    |
| Final step is the only step              | the final item's path                              | `the final step needs at least one step before it`        |
| Empty script                             | `...step.script`                                   | `script must contain at least one command`                |
| Empty pipe id                            | `...step.script[i].pipe`                           | `pipe must not be empty`                                  |
| `condition.changesets` sets neither list | `...condition.changesets`                          | `changesets needs includePaths or excludePaths`           |
| `condition.changesets` sets both lists   | `...condition.changesets`                          | `changesets takes includePaths or excludePaths, not both` |
| Empty definition name                    | `$.definitions.caches[""]`                         | `definition name must not be empty`                       |
| Raw key collides at document level       | `$.raw["image"]`                                   | `raw key "image" is already emitted at this level`        |
| Raw key collides at step level           | `...step.raw["script"]`                            | `raw key "script" is already emitted at this level`       |
| Raw value is not a record                | `$.raw` or `...step.raw`                           | `raw must be a plain record of keys to values`            |

Service and cache names are not checked against `caches` and `services` arrays: a name may come from
a workspace default or a runtime definition, so a dangling reference is not a document error.

### Corpus

Five entries, each pinned by repository, commit, byte count, line count and SHA-256. All five compare
as parsed data with the header suppressed (ADR 0005); none is compared byte for byte.

| Entry                  | Repository                            | Commit                                     | Licence      | Bytes | Lines | SHA-256                                                            |
| ---------------------- | ------------------------------------- | ------------------------------------------ | ------------ | ----- | ----- | ------------------------------------------------------------------ |
| `connect-express`      | `atlassian/atlassian-connect-express` | `d00fcf7836356c3156b29cb5710e29d6da4c03c9` | Apache-2.0   | 1094  | 28    | `4ca824baaaea30212fdbb69aab0c6f7bc65e644d0c145e10a2c17cdd12b9bbf3` |
| `aligent-graphql-mesh` | `aligent/aligent-graphql-mesh`        | `8095504bbdcd878c3e3e7adf6e48ebf953c01c28` | MIT          | 4350  | 135   | `eb5de70a1a61c8b93f43610527a5ab27fc8d9e441dd39cabb7eda4b2b9ca1a47` |
| `obuspa`               | `BroadbandForum/obuspa`               | `59028beba21471d19bd3842ef2632ceb6ca8c7fc` | BSD-3-Clause | 3071  | 60    | `0f80bab81faae1e8b58087b4efdd363a9cc6c528e5baff26ed4a1140ddc18afc` |
| `rair-dapp`            | `rairprotocol/rair-dapp`              | `0afccca0bd38a23e8fc2518cd1fb48612675b607` | Apache-2.0   | 2126  | 74    | `35fd3f918a635cee9b8ad63526437fd33c9a47ab3f1b6857db620b3433edcebf` |
| `systemsdk-symfony`    | `systemsdk/docker-nginx-php-symfony`  | `da31f3c30607a57f394338ce3b31d8bfc06a320a` | MIT          | 948   | 45    | `e5e3bbedb042c62189b66e7da2068766950c1417b2dc87fc698eb28636f3a56e` |

- `connect-express` is the only Bitbucket-hosted entry and the tracer: root `image`, `default` and
  `branches`, `oidc`, and a pipe as the last item of a script.
- `aligent-graphql-mesh` brings `definitions` in all three forms, `caches` with a path map,
  `services` with `memory` and `type`, `custom`, `pull-requests` with a parallel group, `branches`
  with two stages, pipe variables, `size` and artifacts.
- `obuspa` brings a root `clone`, `runs-on` labels, `after-script` and artifacts across sequential
  steps.
- `rair-dapp` brings `condition.changesets.includePaths` and two pull-request selector patterns.
- `systemsdk-symfony` brings `options.docker`, `definitions.steps`, `tags`, `pull-requests` and two
  branch selectors.
- YAML anchors and aliases are resolved by the parser. A fixture writes the resolved data, which is
  why `definitions.steps` entries repeat the step bodies the selectors reference.
- Each fixture starts with a ledger of every raw path it needs, and tickets delete rows as the
  vocabulary covers them. The target at the end of the slice is an empty ledger.
- The vendored files are never edited. A value a fixture cannot express is a ledger row, not a
  fixture fix.
- `PROVENANCE.md` records repo, commit, path, licence, the byte and line counts, the SHA-256 above,
  and the comparison mode for every entry, in the form the shared provenance test parses.

### Schema conformance

- Vendor Atlassian's schema from `https://api.bitbucket.org/schemas/pipelines-configuration`, copied
  2026-10-29: draft-07, `$id` `https://bitbucket.org/product/features/pipelines`, 33,271 bytes,
  SHA-256 `b37319267d9922bd9f0a5142d657551ae844e136fa205068c8660622d66bcf64`, no remote references.
- The copy is byte-identical to the source on that date, keeps the upstream `$id`, and is never
  edited. A refresh updates the row in `docs/references/upstream-schemas.md` and is a deliberate
  change.
- The conformance suite already discovers a provider by the presence of its vendored schema, so
  naming the file `bitbucket-pipelines.json` wires up goldens and corpus entries with no new test.
- Two test-support changes are part of the slice: the remote-reference check runs over every vendored
  schema rather than GitHub Actions alone, and the negative-fixture list becomes per provider, with
  Bitbucket's raw golden as its own entry.
- The schema is a typo net, not a type source. Where the pinned schema rejects a shape Bitbucket
  documents and accepts, the ticket stops and reports; there is no exception list in this slice.

### Documented grammar

Spec 0005 defines the walker, the two declared lists, the closed categories and the refresh rule.
Bitbucket reuses them rather than restating the mechanism.

- `GAPS` holds a schema path the Bitbucket inventory cannot emit, with a `reason` and a `category`
  from `unmodelled | out-of-scope | schema-noise`.
- `OVERCLAIMS` holds a modelled path the schema does not describe, with a `reason`.
  `$.definitions.steps` is expected to be the first entry.
- Both lists are asserted in both directions: an undeclared path fails, an unused row fails.
- Expected `out-of-scope` gaps, to be confirmed against the walker's output: `agents`, `imports` and
  `definitions.pipelines`; `triggers`, `labels` and `export` at the root; `step.auth`, `config`,
  `custom`, `input-variables`, `runtime` and `type`; the expanded artifacts form; AWS image auth;
  `runtime`/`self-hosted` options; and custom-pipeline variable declarations.
- No new ADR: ADR 0011 already records the gate, the categories and the refresh rule. Bitbucket adds
  data, not policy.
- The report goes into the provider page; there is no separate measurement document.

### Documentation

- A provider page at `docs/providers/bitbucket-pipelines.md` follows the provider template: scope,
  generated coverage table, corpus, quirks, non-goals, open gaps, and the documented-grammar section.
  The corpus coverage table is generated from the inventory and the entries, as GitHub Actions'
  is; the documented-grammar section follows spec 0005's generated-section pattern.
- The README provider table moves Bitbucket from `Planned` to `In Progress` with the exact subpath.
- `docs/architecture.md` names the module and its files in the provider surface, links ADR 0013, and
  states that all three providers share the two-function surface. Nothing else in the architecture
  changes: the format rules are already provider-neutral.
- `docs/references/upstream-schemas.md` gains the vendored-copy row for the Bitbucket schema.

## Testing Decisions

- **Seam.** One public seam: `render(pipelineConfig(...))` from
  `@inoffensive/ci-cdk/bitbucket-pipelines`, called as a consumer writes it. Corpus, golden,
  inventory, schema and format tests all assert here.
- **Second seam.** `toDoc` is public per ADR 0013 and gets structural tests only where bytes cannot
  say which stage chose a shape: the item union emits exactly one of `step`/`parallel`/`stage`/`final`,
  the stage sequence is `steps`, and modelled keys precede raw keys. It never substitutes for a bytes
  or data assertion.
- **A good test** asserts emitted bytes, parsed data, a thrown diagnostic, or the gate's verdict. It
  does not assert intermediate node kinds, styles or entry shapes, except in the structural `toDoc`
  tests above.
- **Corpus.** Each entry renders through the primary seam with the header suppressed and is compared
  with the vendored file as parsed data, with no normalisation of the vendored side. The vendored
  bytes and their hash are checked by the shared provenance test.
- **Inventory.** A Bitbucket inventory under the provider's corpus directory renders one or more
  definitions that between them use every modelled key and never `raw`. Its rendered key-path union
  is the modelled set. Shapes that cannot share a document, such as the mutually exclusive
  `condition.changesets` forms, get their own document.
- **Gate.** The exhaustiveness gate fails when a corpus key is neither modelled nor declared, when a
  declared row is unused, and when a modelled key is written through `raw`. Author-named maps
  (`definitions.caches`, `definitions.services`, `branches`, `tags`, `pull-requests`, `custom`,
  `variables`) are normalised to `*`; sequence positions are `[]`.
- **Schema.** Every golden and every corpus entry validates against the pinned schema, and the raw
  golden is the declared negative fixture. The suite proves it rejects an unmodelled key.
- **Documented grammar.** The shared walker's output is diffed against the modelled set, both lists
  are asserted both ways with negative cases, and the report is asserted as sets of paths.
- **Goldens.** `toMatchFileSnapshot` next to the provider, one golden per fixture plus format-lock
  goldens. Regenerating from unchanged source produces no diff.
- **Format lock.** Pins the header line and its suppression, LF endings, one trailing newline, no
  blank lines outside a block scalar, `[]` and `{}` for empty collections, quoted `"*"` and `"**"`,
  `step:` versus `steps:`, a pipe map inside a script sequence, and alphabetical key order at the
  document and step level.
- **Diagnostics.** One test per condition in the diagnostics table, asserting `DiagnosticError` and
  the path; message prose is asserted only where the table fixes it.
- **Prior art.** `src/gitlab-ci/render.test.ts`, `src/gitlab-ci/format-lock.test.ts`,
  `test/corpus/github-actions/inventory.ts`, `test/corpus/github-actions/exhaustiveness.test.ts`,
  `test/corpus/coverage.ts`, `test/schemas/conformance.test.ts`.

## Out of Scope

- Child pipelines and imported/shared definitions: `step.type: pipeline`, `step.custom`,
  `step.config`, `definitions.step-config`, `definitions.imports`, `definitions.pipelines` and
  `export`.
- Bitbucket's agent/AI runtime: `definitions.agents` and the `agent_*` grammar the schema carries.
- Event triggers (`triggers:`), pipeline `labels`, and custom-pipeline variable declarations.
- `step.auth`, `step.input-variables`, `step.runtime`, `options.runtime`, self-hosted runtime
  volumes and cloud runtime settings.
- The expanded artifacts form (`download`/`upload`, named artifacts, capture-on), and AWS or OIDC
  registry auth for images.
- Resolving `definitions` names, `include`-like imports or any cross-file reference. They are emitted,
  never loaded or verified.
- A CLI or file-writing behaviour; `render` still returns text.
- Refreshing the vendored schema, and modelling any declared `GAPS` row. Triage classifies; a row
  becomes vocabulary only when a pinned corpus entry already needs it.

## Further Notes

- The tracker is local: tickets are files under `docs/tickets/`, and no issue is published. The
  `ready-for-agent` status line stands in for a triage label.
- The next free ticket number is 45; 33-44 belong to spec 0006's GitLab breadth. The shared walker
  and the gate policy from spec 0005 are already on main (ADR 0011), so the documented-grammar ticket
  waits only on Bitbucket's own inventory.
- ADR numbering reserves 0011 for spec 0005's walker and 0012 for spec 0006's `!reference` leaf, so
  this slice adds 0013. If either predecessor changes its number, renumber Bitbucket's ADR with it.
- The five corpus files are pinned external artifacts. Fetch them at the commit and verify the hash
  before writing a fixture; do not refresh them mid-slice.
- `atlassian/atlassian-connect-express` is served by the Bitbucket API, not GitHub; fetch its bytes
  from `api.bitbucket.org` at the pinned commit and check the hash rather than copying from a browser.
- The `*` and `**` selector patterns are plain strings in the DSL and quoted by the serializer. Do not
  "fix" them by typing them as anything else, and do not hand-edit the goldens to match a different
  quoting.
- The spec 0004 note about GitLab's `script` lowering to plain style does not apply here: Bitbucket's
  `script` is always a sequence, and its items are strings or pipe maps.
- The coverage ledger is expected to be non-empty during the slice and empty at the end. Do not
  "close" a row by moving the key into `raw` a second time or by editing a vendored file.
- Every ticket ends with `pnpm check`, and the format-affecting ones update goldens deliberately rather
  than accepting a snapshot write.
