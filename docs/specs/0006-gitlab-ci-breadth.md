# Spec 0006: The GitLab CI provider, breadth

Status: ready-for-agent
Covers: the GitLab breadth slice, successor to spec 0004 and modelled on the structure spec 0003 gave
GitHub Actions. It adopts the shared schema walker and documented-grammar gate that spec 0005 builds
for GitHub Actions, so GitLab does not need a later measurement epic of its own.
Respects: ADR 0001, ADR 0002, ADR 0005, ADR 0006, ADR 0008, ADR 0009, ADR 0010, ADR 0011, specs
0001-0005.
Adds: ADR 0012 (the `!reference` leaf).

## Problem Statement

The GitLab provider models three of the 39 keywords the GitLab syntax reference documents: `stages`,
`stage` and `script`. Everything else is written through `raw`, which is an untyped escape hatch: it
accepts any nesting, validates nothing, and counts against the coverage ledger rather than the
vocabulary.

The current evidence is one corpus entry, `gitlab-org/terraform-images`, a container-build pipeline.
It exercises `image`, `services`, `rules`, `release` and `parallel` only as data through `raw`. A
consumer with a Go library pipeline cannot type its `cache:key.files`, a deploy pipeline cannot type
`environment`, and a rules-heavy pipeline cannot type `rules:when` or `allow_failure`. The only
feedback is a runtime pipeline failure, which is the problem the package exists to remove.

There is also no measurement. GitHub Actions has a modelled-path inventory and an exhaustiveness gate
that make "supported" a test verdict; GitLab has a ledger and no gate, so every new field is
unmeasured and the ledger is the only signal. GitLab's schema is not vendored, so emitted output is
never checked against the provider's own grammar.

The `raw` ledger for the one entry is 19 rows, all vocabulary gaps and zero byte-fidelity rows. That
number is the roadmap, and it is the only number the repo can currently produce.

## Solution

Make GitLab coverage measurable, then widen it until the ledger is empty for three pinned real
configurations.

- Add a GitLab modelled-path inventory and an exhaustiveness gate, mirroring the GitHub Actions
  machinery and reusing the shared corpus helpers.
- Vendor GitLab's official `ci.json` at a pinned commit and validate emitted inventory and corpus
  documents against it.
- Wire that schema into the shared documented-grammar walker and diff it against the modelled set, so
  GitLab inherits the same gap/overclaim measurement spec 0005 builds for GitHub Actions instead of
  opening a second measurement epic later.
- Add two more corpus entries, chosen for shapes the current entry cannot reach:
  `gitlab-org/labkit` (defaults, includes, workflow rules, anchors, cache keys, matrix aliases) and
  `gitlab-org/gitlab-pages` (includes with rules, defaults, a hidden template, `extends` and `needs`).
- Model the keyword groups those entries and a normal pipeline use, in dependency order: global
  configuration, then job fundamentals, then rules and needs, then delivery and scheduling keys, then
  the `!reference` leaf.
- Model hidden templates as author data (`templates`), not vocabulary. They are how anchors, aliases
  and `extends` targets are shared, and every pinned entry uses them.
- Delete ledger rows as fields are modelled; the target is zero vocabulary-gap rows across the three
  entries, with hidden templates outside the metric.

The result: a consumer can write a realistic GitLab pipeline with typed `variables`, `image`,
`services`, `cache`, `artifacts`, `rules`, `needs`, `environment`, `parallel` and `include`, and the
gate fails if the vocabulary and the corpus drift.

## User Stories

1. As a library consumer, I want `variables` at pipeline and job level to accept strings, numbers,
   booleans and leaves, so that `STABLE_VERSION: "1.5"` stays a string and `PARALLEL: 4` stays a
   number.

2. As a library consumer, I want `default` to accept the job defaults GitLab supports, so that a
   pipeline sets one `image` and one `tags` list instead of repeating them on every job.

3. As a library consumer, I want `include` to accept local, remote, template, project and component
   entries, so that a pipeline can name its includes without resolving them.

4. As a library consumer, I want `include` entries to carry `rules`, `inputs` and `integrity`, so that
   a conditional or parameterised include is expressible.

5. As a library consumer, I want `workflow` to accept `name`, `rules` and `auto_cancel`, so that the
   pipeline-level gate is typed.

6. As a library consumer, I want `image` to accept a string or a `name`/`entrypoint`/`pull_policy`
   map, so that a Kaniko or Crane image with a cleared entrypoint is expressible.

7. As a library consumer, I want `services` to accept strings and service maps, so that a database
   service is typed rather than raw.

8. As a library consumer, I want `before_script` and `after_script` to accept the same script shape as
   `script`, so that all three compose the same way.

9. As a library consumer, I want `tags` to accept a string array, so that runner selection is typed.

10. As a library consumer, I want `extends` to accept a name or names, so that hidden templates are
    reusable without raw.

11. As a library consumer, I want `cache` to accept a single cache or an array, a string key or a
    `key.files`/`prefix` map, `paths`, `policy`, `when` and `fallback_keys`, so that the caching in
    `labkit` is expressible.

12. As a library consumer, I want `artifacts` to accept `paths`, `exclude`, `name`, `expire_in`,
    `expose_as`, `public`, `when` and `reports`, so that a test report and a build output are typed.

13. As a library consumer, I want `rules` to accept `if`, `changes`, `exists`, `when`, `allow_failure`,
    `variables` and `needs`, so that a conditional job is typed end to end.

14. As a library consumer, I want `needs` to accept job names and need maps with `optional`,
    `artifacts` and `parallel`, so that a DAG is expressible.

15. As a library consumer, I want `environment` to accept a name or a map with `url`, `action`,
    `on_stop`, `auto_stop_in` and `deployment_tier`, so that a deploy job is typed.

16. As a library consumer, I want `parallel` to accept a count or a matrix of flat scalar rows, so that
    a version matrix is an ordinary array literal.

17. As a library consumer, I want `retry` to accept a count or a `max`/`when`/`exit_codes` map, so that
    flaky-job policy is typed.

18. As a library consumer, I want `timeout`, `interruptible`, `allow_failure`, `when`,
    `resource_group`, `coverage` and `release` to be typed fields, so that the remaining scheduling and
    delivery keys are not raw.

19. As a library consumer, I want `release` to accept `tag_name`, `description`, `name`, `ref`,
    `milestone` and `released_at`, so that the release job in the existing corpus is modelled.

20. As a library consumer, I want a `ref` leaf that emits `!reference` for a path such as
    `[".setup", "script"]`, so that a templated script reference is expressible without raw.

21. As a library consumer, I want `ref` accepted anywhere `Text` is accepted, so that it composes with
    `script`, `before_script` and `after_script`.

22. As a library consumer, I want every new author map to preserve key order, so that a `variables` or
    `reports` block diffs the way I wrote it.

23. As a library consumer, I want every new field to leave an absent value unemitted, so that adding
    the vocabulary does not add empty keys to my file.

24. As a maintainer, I want a GitLab inventory that exercises every modelled key, so that "modelled"
    is the inventory's rendered key-path union rather than a claim.

25. As a maintainer, I want an exhaustiveness gate that fails when the corpus uses a key the inventory
    does not model unless the ledger declares it, so that coverage cannot silently regress.

26. As a maintainer, I want the gate to fail when the ledger declares a row the corpus does not use, so
    that closed gaps disappear from the roadmap.

27. As a maintainer, I want the three corpus entries compared as parsed data, so that key order,
    quoting and blank lines do not decide what "supported" means.

28. As a maintainer, I want every raw path in the new entries declared with a vocabulary-gap reason,
    so that the ledger is an honest to-do list until it reaches zero.

29. As a maintainer, I want emitted inventory and corpus documents validated against GitLab's vendored
    `ci.json`, so that the types and the provider's own grammar agree.

30. As a maintainer, I want the schema pinned by commit and hash, so that upstream churn cannot break
    the build and refreshing is a deliberate change.

31. As a maintainer, I want the GitLab provider page to state scope, corpus, quirks and open gaps, so
    that the next contributor starts from evidence rather than documentation.

32. As a maintainer, I want the gate and the ledger to reach zero vocabulary-gap rows at the end of
    this slice, so that "supports GitLab CI" has a measurable target.

33. As a maintainer, I want ADR 0012 to record the `!reference` leaf as a widening of the provider
    surface, so that the decision is not smuggled in as a field.

34. As a library consumer, I want `templates` to accept an ordered map of `.`-prefixed names to plain
    data, so that anchor-only entries and `extends` targets are expressible without `raw`.

35. As a maintainer, I want hidden templates excluded from the vocabulary gate and stripped before
    schema validation, so that author data does not pollute the coverage metric.

36. As a maintainer, I want GitLab's vendored schema walked into key paths and diffed against the
    modelled set, so that "what can GitLab write that we cannot" is a list with a size.

37. As a maintainer, I want every gap categorised as `unmodelled`, `out-of-scope` or `schema-noise`, so
    that only the first is debt and the other two are decisions.

38. As a maintainer, I want modelled paths the schema rejects reported as overclaims, so that a stale
    schema and a provider bug are both visible.

39. As a maintainer, I want a schema refresh that introduces an unruly path to fail the suite, so that
    refreshing is always a reviewed change.

40. As a consumer, I want the provider page to show documented-grammar coverage beside corpus coverage,
    so that the claim and its debt are one artefact.

## Implementation Decisions

### Modules and public surface

- The `gitlab-ci` provider gains `inventory` and `exhaustiveness` test support mirroring the GitHub
  Actions corpus machinery, plus a `leaves` module for `ref`. It continues to expose only `render`,
  `toDoc`, `pipeline`, `job`, `ref` and the types.
- `ref` is a new public export and therefore needs ADR 0012: it widens the surface ADR 0008 set, it is
  the first GitLab leaf, and it exists because `!reference` carries a tag no plain string can.
- Core is unchanged. The shared corpus helpers (`test/corpus/paths.ts`, `vendored.ts`, `coverage.ts`,
  `provenance.test.ts`) are reused, not forked.

### Scalar types

```ts
export type Scalar = string | number | boolean | LeafNode;
export type Script = Text | readonly Text[];
export type When = "on_success" | "on_failure" | "always" | "never" | "manual" | "delayed";
```

- `Scalar` is provider-local. It is used for `variables` values, `rules:variables` values, matrix row
  values, `artifacts:reports` entries and any other author-named scalar map.
- ADR 0010 makes a numeric-looking string stay a string, so `"1.5"` and `1.5` are distinct through
  every `Scalar` field.
- `null` is not a `Scalar`; an absent value is an absent key, not a null.

### Structs

- `Pipeline` gains `default`, `include`, `variables`, `workflow` and `templates` beside `stages`,
  `jobs` and `raw`.
- `Job` gains, in addition to `name`, `stage`, `script`, `raw`: `extends`, `needs`, `rules`, `tags`,
  `image`, `services`, `variables`, `cache`, `artifacts`, `before_script`, `after_script`,
  `environment`, `release`, `parallel`, `retry`, `timeout`, `interruptible`, `allow_failure`, `when`,
  `resource_group` and `coverage`.
- `Default` covers only the defaults this slice models: `image`, `services`, `tags`, `before_script`,
  `after_script`, `cache`, `artifacts`, `retry`, `timeout`, `interruptible`.
- Builders stay near-identity and never validate or merge.

### Shapes

| Field         | Accepted shape                                                                                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `image`       | `Text` or `{ name: Text; entrypoint?: readonly Text[]; pull_policy?: ImagePullPolicy }`                                                                                                                                                                                               |
| `services`    | readonly array of `Text` or `{ name: Text; alias?: Text; entrypoint?: readonly Text[]; command?: readonly Text[]; variables?: Record<string, Scalar> }`                                                                                                                               |
| `variables`   | `Record<string, Scalar>` at pipeline, job and default level                                                                                                                                                                                                                           |
| `cache`       | one `Cache` or a readonly array; `Cache = { key?: Text \| { files: readonly string[]; prefix?: Text }; paths: readonly string[]; policy?: "pull" \| "push" \| "pull-push"; when?: "on_success" \| "on_failure" \| "always"; fallback_keys?: readonly string[]; untracked?: boolean }` |
| `artifacts`   | `{ paths?: readonly string[]; exclude?: readonly string[]; name?: Text; expire_in?: Text; expose_as?: Text; public?: boolean; when?: "on_success" \| "on_failure" \| "always"; reports?: Record<string, readonly string[]> }`                                                         |
| `rules`       | readonly array of `{ if?: Text; changes?: { paths: readonly string[]; compare_to?: Text }; exists?: readonly string[]; when?: When; allow_failure?: boolean; variables?: Record<string, Scalar>; needs?: readonly string[] }`                                                         |
| `needs`       | readonly array of `string \| { job: string; optional?: boolean; artifacts?: boolean; parallel?: { matrix: readonly Readonly<Record<string, Scalar>>[] } }`                                                                                                                            |
| `extends`     | `string` or readonly `string[]`                                                                                                                                                                                                                                                       |
| `environment` | `Text` or `{ name: Text; url?: Text; action?: "start" \| "prepare" \| "stop" \| "verify" \| "access"; on_stop?: Text; auto_stop_in?: Text; deployment_tier?: Text }`                                                                                                                  |
| `parallel`    | `number` or `{ matrix: readonly Readonly<Record<string, Scalar>>[] }`                                                                                                                                                                                                                 |
| `retry`       | `number` or `{ max: number; when?: readonly string[]; exit_codes?: readonly number[] }`                                                                                                                                                                                               |
| `release`     | `{ tag_name: Text; description: Text; name?: Text; ref?: Text; milestone?: Text; released_at?: Text }`                                                                                                                                                                                |
| `trigger`     | `Text` or `{ project: Text; branch?: Text; ref?: Text; strategy?: "depend" \| "mirror"; inputs?: Record<string, Scalar> }` or `{ include: IncludeEntry \| readonly IncludeEntry[]; strategy?: "depend" \| "mirror" }`; emitted as data, never resolved                                |
| `include`     | one entry or readonly array; each entry is `{ local: Text }`, `{ remote: Text }`, `{ template: Text }`, `{ project: Text; ref?: Text; file: Text \| readonly Text[] }` or `{ component: Text; inputs?: Record<string, Scalar> }`, each optionally with `rules` and `integrity`        |
| `workflow`    | `{ name?: Text; auto_cancel?: { on_new_commit?: "conservative" \| "interruptible" \| "none"; on_job_failure?: "all" \| "none" }; rules?: readonly Rule[] }`                                                                                                                           |
| `templates`   | `Record<string, Value>`; every key starts with `.`, values are plain data of any shape, order preserved                                                                                                                                                                               |

`ImagePullPolicy` is the closed union GitLab documents (`always`, `if-not-present`, `never`). `When`
is the closed union above and is shared by `rules`, `artifacts` and cache where GitLab accepts the
same values.

### Emission order

Order is fixed and presentation-only; GitLab gives mapping order no meaning, so one order keeps two
definitions with the same data byte-identical.

- Pipeline: `default`, `include`, `stages`, `variables`, `workflow`, `templates` entries in record
  order, job entries in array order, then pipeline `raw`.
- Default: `image`, `services`, `tags`, `before_script`, `after_script`, `cache`, `artifacts`, `retry`,
  `timeout`, `interruptible`.
- Job: `stage`, `extends`, `needs`, `rules`, `tags`, `image`, `services`, `variables`, `cache`,
  `artifacts`, `before_script`, `script`, `after_script`, `environment`, `release`, `trigger`,
  `parallel`, `retry`, `timeout`, `interruptible`, `allow_failure`, `when`, `resource_group`,
  `coverage`, then job `raw`.

Within author maps (`variables`, `reports`, `matrix` rows), insertion order is preserved.

### Semantics and diagnostics

- `before_script` and `after_script` accept `Script`; a bare string lowers through the boundary parser
  with no inferred style, exactly as `script` does. A `ref` leaf carries its own tag.
- `extends` is not resolved. A target may live in an include, so a missing target is not a
  document-level diagnostic.
- `needs` is not checked for dangling names for the same reason: the target may be included. Only the
  existing checks remain: empty/duplicate/reserved/hidden job names, empty/duplicate stages, an
  unavailable explicit stage, and an empty script. Neither `script` nor `stage` need be declared, and
  an omitted stage is not checked against `stages`, because a merge may supply either (ADR 0014).
- `rules` order is author order. `when: never`, `allow_failure` and `needs` inside a rule are preserved
  as written.
- `include` entries are never fetched, resolved or verified; their values are typed strings and maps.
- `default` never merges with a job at build time. GitLab applies the defaults; the DSL only emits them.
- `templates` are hidden jobs and anchor-only entries: a top-level key starting with `.` and any plain
  data value. They are author data, not vocabulary: never validated, never resolved, and emitted in
  record order between `workflow` and the job entries. A `templates` key without the leading `.` is a
  diagnostic, because it would emit a second runnable key at the document root.
- A job name starting with `.` stays refused in `jobs`; hidden entries belong in `templates`. That
  keeps the runnable set and the author's shared data separate.
- `ref(segments)` emits a sequence with the `!reference` tag. The segments are author-provided strings;
  the referenced path is never resolved or validated. It is usable wherever a `Text` or `Scalar` is
  accepted, and inside script arrays.
- A raw key still collides with a modelled key or a job name as it does today; the collision survives
  because raw exists for keys the vocabulary does not model, not as an override.

### Corpus

The slice starts with the existing entry and adds two, each pinned and hashed. All three compare as
parsed data with the header suppressed (ADR 0005).

| Entry              | Repo                          | Commit                                     | Licence                                   | Bytes     | SHA-256                                                            |
| ------------------ | ----------------------------- | ------------------------------------------ | ----------------------------------------- | --------- | ------------------------------------------------------------------ |
| `terraform-images` | `gitlab-org/terraform-images` | `4230b972896ea9b4c23322855bcf76256e5ae1c9` | MIT, Copyright (c) 2021 GitLab.org        | 113 lines | `a23bae8c45f5c88036203ec1b396ed7a2185627751f875e4418014c21fc03c9a` |
| `labkit`           | `gitlab-org/labkit`           | `8024160e53afaa18991004aa3e06dd336665f983` | MIT, Copyright (c) 2011-2026 GitLab, Inc. | 518 lines | `ec24d2817707bdbaf093ea56b12a0ec9224f9a894cf95845f5c80501bc9e89ea` |
| `gitlab-pages`     | `gitlab-org/gitlab-pages`     | `80b941cceb10cb8c18e6cb09314a20ff08847f3e` | MIT, Copyright GitLab Inc.                | 50 lines  | `99145262691ca02eb9faf0e6181d5dbde33bea4025c5ff1f5709386d81f2cd17` |

- `labkit` brings `default`, `workflow:rules`, `include` (local, project and component with inputs),
  `variables`, hidden templates, cache `key.files`/`prefix`/`policy`, matrix aliases and `when: never`.
  Its YAML anchors and aliases are resolved by the parser; the fixture writes the resolved data.
- `gitlab-pages` brings `include` with a component and rules, `default` image/tags, a hidden template
  with `variables` and `cache`, and a job with `needs`, `extends`, `script` and `cache`.
- Each new entry starts with a ledger of every raw path it needs, then tickets delete rows as the
  vocabulary covers them. The target at the end of this slice is an empty ledger.
- Hidden templates never earn a ledger row: they are authored data, and the gate excludes top-level
  `.`-prefixed keys on both sides. `.terraform-versions` moves from `raw` to `templates` rather than
  closing a row.
- A file that needs `raw` for a key the inventory models is a fixture error, not a ledger row.

### Schema conformance

- Vendor GitLab's official schema from `gitlab-org/gitlab` at commit
  `28aa2bf90771a11ecc2f86525bc8a70a49c4d810`, path `app/assets/javascripts/editor/schema/ci.json`,
  MIT licence, 128,105 bytes, SHA-256
  `1c6eeb7d3a34c39996afbfe1ade220480eb05bbeae674e86d3c745dfeeded7fd`.
- The copy keeps the upstream `$id`, is byte-identical to the pinned blob, and is never edited. A
  refresh changes the row above and is a deliberate change.
- `ajv` is already pinned and configured for draft-07 with strict mode off, as for GitHub Actions. The
  conformance test validates every inventory document and every corpus entry's rendered output.
- Hidden templates are stripped from both sides before validation. The schema describes jobs and
  globals; GitLab accepts anchor-only `.`-prefixed data that the schema does not model, so validating
  it would report the provider's own parser as the error. The rest of the document is validated
  unchanged.
- The schema is a typo net, not a type source. If the pinned schema rejects a modelled shape GitLab
  accepts, the ticket stops and reports; there is no exception list in this slice.

### Documented grammar

Spec 0005 defines the walker, the two declared lists, the closed categories and the refresh rule. GitLab
reuses them rather than restating the mechanism.

- The walker is shared test support under `test/schemas/`; the GitLab diff and its two lists are
  provider-local.
- `GAPS` holds a schema path the GitLab inventory cannot emit, with `reason` and `category` from
  `unmodelled | out-of-scope | schema-noise`.
- `OVERCLAIMS` holds a modelled path the GitLab schema does not allow, with `reason`.
- Both lists are asserted in both directions: an undeclared path fails, an unused row fails.
- Paths use the inventory's notation, and the report is sorted and de-duplicated.
- No new ADR: ADR 0011 already records the gate, the categories and the refresh rule. GitLab adds data,
  not policy.
- Triage classifies; it does not build vocabulary. A gap becomes vocabulary only when a pinned corpus
  entry already needs it.

## Testing Decisions

- **Seam.** `render(pipeline(...))` from `@inoffensive/ci-cdk/gitlab-ci`, called as a consumer writes
  it. Corpus, inventory, schema and golden tests all assert here.
- **Second seam.** `toDoc` stays public per ADR 0008 and is used only where bytes cannot say which
  stage was wrong: the emission order of the new global keys and the `ref` node. It is never a
  substitute for a bytes or data assertion.
- **A good test** asserts emitted bytes, parsed data, a thrown diagnostic, or the gate's verdict. It
  does not assert private helper shapes or key order the format contract does not fix.
- **Inventory.** A GitLab inventory under `test/corpus/gitlab-ci/` renders one or more definitions that
  between them use every modelled key, and never `raw`. Its rendered key-path union is the modelled
  set.
- **Gate.** The exhaustiveness gate fails when a corpus key is neither modelled nor declared, when a
  declared row is unused, and when a modelled key is written through `raw`. Top-level keys starting
  with `.` are normalised as author data and excluded on both sides. Reuse the shared path helper and
  the `AUTHOR_NAMED` normalisation pattern from GitHub Actions.
- **Corpus.** Each entry compares parsed data; the vendored bytes and their hash are tested by the
  shared provenance test.
- **Schema.** Inventory and corpus output validate against the pinned schema with hidden templates
  stripped.
- **Documented grammar.** The shared walker's output is diffed against the modelled set; both lists
  are asserted both ways with negative cases, and the report is asserted as sets of paths. The walker
  itself is tested by spec 0005, not here.
- **Goldens.** New fields add new goldens only where they are set; existing goldens must not change.
  Regenerating from unchanged source produces no diff.
- **Prior art.** `test/corpus/github-actions/exhaustiveness.test.ts`, `inventory.ts`,
  `conformance.test.ts`, the schema walker and diff from spec 0005, and the GitLab format lock from
  ticket 26.

## Out of Scope

Two kinds of exclusion, and only the first is permanent.

**Architectural non-goals.** These are properties of a typed constructor rather than missing fields,
and no provider in this package will resolve them:

- Bitbucket Pipelines.
- Resolving `include`, `extends`, `!reference` or cross-file job references. They are emitted, never
  loaded or verified.
- A `spec` header, inputs interpolation and component context (`$[[ ... ]]`); `include:inputs` is
  passed through as data only.
- Child pipelines and multi-document pipelines as a composition mechanism.
- A CLI or file-writing behaviour; `render` still returns text.
- Refreshing the vendored schema.

**Deferred keywords.** `pages`, `secrets`, `id_tokens`, `hooks`, `identity`, `manual_confirmation`,
`run`, `start_in`, `dast_configuration`, `inherit`, `dependencies` and `rules:changes:compare_to` are
not modelled in this slice. They are ordinary fields GitLab documents, deferred to keep this slice
finite; spec 0008 is the vehicle that promotes them, one pinned corpus entry at a time. `trigger` is
no longer deferred: ticket 59 models it because the labkit corpus already uses it.

`GAPS` still labels a deferred keyword `out-of-scope` until a corpus entry obliges us to model it. The
gap report is therefore a snapshot of this slice, not a claim that the key can never be supported.

## Further Notes

- The tracker is local: tickets are files under `docs/tickets/`, no issue is published. The
  `ready-for-agent` status stands in for a triage label.
- The next free ticket number depends on the Bitbucket work; check `docs/tickets/` on main before
  allocating. 29-32 belong to spec 0005 and 45-58 to the Bitbucket provider and release chores.
- Ticket 35 depends on spec 0005's shared walker. If that work has not merged, 33, 34 and 37-44 can
  still proceed; only 35 and 36 wait.
- The three corpus files are pinned external artifacts. Fetch them at the commit and verify the hash
  before writing a fixture; do not refresh them mid-slice.
- The schema is the largest vendored file in the repo. The formatter ignores `test/schemas/*.json`.
- The coverage ledger is expected to be non-empty during the slice and empty at the end. Do not
  "close" a row by moving the key into `raw` a second time or by editing a vendored file.
- Every ticket in this slice ends with `pnpm check`, and the format-affecting ones update goldens
  deliberately rather than accepting a snapshot write.
