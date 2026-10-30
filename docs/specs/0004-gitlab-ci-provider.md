# Spec 0004: The GitLab CI provider, first slice

Status: ready-for-agent
Covers: the first provider after the seven-step build order in `docs/architecture.md`, in the order
the Decisions table settles: GitHub Actions, then GitLab, then Bitbucket.
Respects: ADR 0001, ADR 0002, ADR 0005, ADR 0006, spec 0001, spec 0002.
Adds: ADR 0008 (the GitLab public surface).

## Problem Statement

`@inoffensive/ci-cdk` ships one provider. Its core is provider-neutral, and the emitted format is
frozen by goldens, but nothing proves that the provider layer is a template and not a one-off shaped
around GitHub Actions. A consumer who wants GitLab CI has no subpath, no types and no `render`, while
the README already marks GitLab as planned.

The first provider also left one question open that only a second implementation can answer: does the
existing `Doc` and `renderDoc` pair cover a provider whose jobs are named entries in a map, whose
scripts are strings or sequences of strings rather than a single shell block, and whose global
keywords share the document root with job names? If the answer is no, the fix belongs in the
provider, not in core.

A consumer can write `.gitlab-ci.yml` by hand and learn at pipeline creation that a job names a stage
that does not exist, that two jobs share a name, or that a job is silently not a job because its name
is the reserved `image` keyword.

## Solution

Ship the smallest complete GitLab CI path: a pipeline struct with `stages` and an array of named
jobs, each with an optional `stage` and a required `script`, lowered to a `Doc` and rendered by the
existing serializer. Document-level validation catches the mistakes that only exist once the whole
document is visible. A `raw` escape hatch carries every key this slice does not model, so a real
pinned GitLab config can be reproduced and the remaining grammar is a counted roadmap rather than
prose.

The consumer calls `render(pipeline(...))`; the provider author gets `toDoc(pipeline)` as well, the
same two-function surface GitHub Actions settled in ADR 0003. This slice models no GitLab leaves:
GitLab's `${VAR}` interpolation is plain text, and `!reference` is out of scope.

The first corpus entry is `gitlab-org/terraform-images` at commit
`4230b972896ea9b4c23322855bcf76256e5ae1c9`. It is 113 lines under the MIT licence, has four real jobs
and one hidden template, and uses `stages`, `stage`, `script` and `before_script` beside `workflow`,
`variables`, `image`, `needs`, `rules`, `release` and `parallel`. The modelled fields reproduce; the
rest is `raw`, which is exactly the coverage ledger the corpus exists to produce.

## User Stories

1. As a library consumer, I want to import `render`, `pipeline` and `job` from
   `@inoffensive/ci-cdk/gitlab-ci`, so that the provider exists at the subpath the README promises.

2. As a library consumer, I want `render(pipeline(...))` to return the file's text and leave writing
   it to me, so that path selection and dry runs stay my decision.

3. As a library consumer, I want `render` to accept the same `{ header }` option as GitHub Actions,
   so that suppressing the generated header needs no GitLab-specific knowledge.

4. As a library consumer, I want `pipeline({ stages, jobs })` to return a plain readonly struct, so
   that I can compose pipelines with object spread and array literals.

5. As a library consumer, I want `job({ name, stage, script })` to keep `name` on the struct, so
   that shared job functions can rename or de-duplicate jobs by spreading the struct.

6. As a library consumer, I want the `jobs` array lowered to a map keyed by job name in array order,
   so that the emitted file matches what GitLab expects and two runs of the same definition agree.

7. As a library consumer, I want `stage` to be optional and emitted only when I set it, so that
   GitLab's default `test` stage assignment is not restated in my definition.

8. As a library consumer, I want `script` to accept a single string, so that a one-line command can
   be written as one line.

9. As a library consumer, I want `script` to accept a string array, so that multi-command jobs are
   an ordinary array literal and compose by concat.

10. As a library consumer, I want a script string containing a newline to keep its exact value after
    a render and parse, so that a multi-line command survives without a provider-specific leaf.

11. As a library consumer, I want a script string that needs quoting (`: `, ` #`, `yes`, `1.10`) to
    be emitted as valid YAML that parses back to the same string, so that shell text never becomes a
    different YAML type.

12. As a library consumer, I want an empty `stages` array to emit `[]` rather than a blank key, so
    that the empty case has one spelling and a golden can pin it.

13. As a library consumer, I want unmodelled GitLab keys written through `raw` at pipeline and job
    level, so that a real config is expressible before its whole grammar is modelled.

14. As a library consumer, I want raw entries appended after the modelled keys at their own level,
    so that adding a raw key never reorders the keys the DSL owns.

15. As a library consumer, I want a raw key that collides with a modelled key or a job name to be
    refused with a diagnostic, so that no document silently contains the same key twice.

16. As a library consumer, I want two jobs with the same name to be refused before the file is
    written, so that a last-wins map entry cannot delete a job.

17. As a library consumer, I want a job name that is a GitLab global keyword (`image`, `stages`,
    `workflow`, `variables`, ...) to be refused, so that a job is never emitted as a global setting.

18. As a library consumer, I want a job name that starts with `.` to be refused, so that a runnable
    job is never silently emitted as a hidden template.

19. As a library consumer, I want a job whose effective stage is not in the pipeline's stages to be
    refused, so that a typo fails in my script rather than at pipeline creation.

20. As a library consumer, I want `.pre` and `.post` accepted as a job stage whether or not `stages`
    is declared, so that the two implicit stages need no special definition.

21. As a library consumer, I want duplicate or empty stage names refused, so that stage order is not
    ambiguous.

22. As a library consumer, I want an empty script (an empty array or an empty string) refused, so
    that a job that cannot run is caught before the pipeline exists.

23. As a library consumer, I want every diagnostic to carry the path I would use to find the problem
    (`$.jobs[2].stage`, `$.raw[".template"]`), so that a failure in a shared definition points at the
    value I wrote.

24. As a library consumer, I want all document diagnostics reported in one throw, so that fixing a
    pipeline is one pass rather than one error per run.

25. As a provider author, I want `toDoc` exported, so that I can inspect the tree before rendering
    and debug key order without parsing the emitted text.

26. As a provider author, I want the GitLab provider to import only core, so that the two providers
    stay independent and the boundary rules keep holding.

27. As a maintainer, I want a pinned real GitLab config reproduced as parsed data, so that "supports
    GitLab CI" has a measurable meaning from the first slice.

28. As a maintainer, I want every raw path the fixture uses declared in a ledger with a reason, so
    that the remaining grammar is a roadmap and not a vague promise.

29. As a maintainer, I want the first slice to change no core module, so that the claim that `Doc` is
    a superset of provider needs is tested rather than assumed.

30. As a maintainer, I want ADR 0008 to record the GitLab surface, so that a later widening is a
    deliberate decision rather than an accident.

31. As a maintainer, I want the README and the architecture's provider surface to name GitLab, so
    that the documentation does not describe a package with one provider.

## Implementation Decisions

### Module and public surface

- A new provider module named `gitlab-ci` is the third stage's second implementation. It contains
  `types`, `to-doc`, `validate`, `render` and `index`, mirrored from the GitHub Actions provider.
- It has no `leaves`, `trigger` or `on-doc` module in this slice. GitLab's `${VAR}` is plain text and
  needs no style, and this slice does not model `!reference`.
- `index` re-exports `render`, `toDoc`, `pipeline`, `job` and the types `Pipeline`, `Job`, `Script`.
  Nothing else in the module is importable by consumers.
- The package's `./gitlab-ci` subpath export and the provider's zone in the boundary configuration
  are part of this slice, because `pnpm check` compiles and checks the queue.
- Core is unchanged. No new runtime dependency is added; `yaml` stays pinned exactly.
- ADR 0008 records that GitLab exports both `render` and `toDoc`, names ADR 0003 as its precedent,
  and records that this provider exports no leaves. It supersedes nothing.

### Structs

```ts
export type Script = Text | readonly Text[];

export interface Job {
  readonly name: string;
  readonly stage?: string;
  readonly script: Script;
  readonly raw?: Readonly<Record<string, Value>>;
}

export interface Pipeline {
  readonly stages?: readonly string[];
  readonly jobs: readonly Job[];
  readonly raw?: Readonly<Record<string, Value>>;
}

export const pipeline = (value: Pipeline): Pipeline => value;
export const job = (value: Job): Job => value;
```

- `name` is the job's identity and the emitted map key. It is stripped from the job body.
- `Text` is core's `string | LeafNode`; `Value` is core's boundary type.
- Builders are near-identity and never validate or merge.
- No `variables`, `default`, `image`, `include`, `workflow`, `before_script`, `after_script`, `tags`,
  `needs`, `rules`, `artifacts`, `cache`, `extends` or any other GitLab keyword becomes a field in
  this slice. They are written through `raw`.

### Lowering

- Pipeline body order is: `stages` when defined, then one map entry per job in array order keyed by
  `name`, then pipeline `raw` entries in the record's insertion order.
- Job body order is: `stage` when defined, then `script`, then job `raw` entries in the record's
  insertion order.
- `stages` lowers through the boundary parser as a sequence; an empty sequence is `[]`.
- `script` lowers through the boundary parser as given. A string or a leaf becomes one scalar; a
  readonly array becomes a sequence in author order. No style is inferred and no literal block is
  produced: real configs write `script: echo "..."`, and a block scalar would add a trailing newline,
  changing the parsed value. Quoting is the serializer's job, so `: `, ` #`, `yes` and `1.10` stay
  strings.
- A value carrying a `DOC` leaf keeps its own style; that is the only path to a non-plain scalar.
- `raw` is lowered as one map through the boundary parser. Its entries are appended after the
  modelled entries. A raw key already emitted at that level is refused, and the document is not
  emitted.
- Pipeline-level raw may write GitLab global keywords and hidden job templates (keys starting with
  `.`). Job-level raw may write any job keyword except `name`, `stage` and `script`.

### Diagnostics

`toDoc` is the only place that validates and the only place that throws. `validate` collects every
problem; `toDoc` throws one `DiagnosticError` carrying all of them. Paths use core's notation: `$`,
`.key` for identifier-shaped keys, `["key"]` otherwise, and raw paths are rebased so they point at
the entry the author wrote.

| Condition                              | Path                                                         | Message shape                                                   |
| -------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------- |
| Empty job name                         | `$.jobs[i].name`                                             | `job name must not be empty`                                    |
| Duplicate job name                     | `$.jobs[i].name` for each occurrence                         | `duplicate job name "build": $.jobs[0].name and $.jobs[3].name` |
| Job name is a GitLab global keyword    | `$.jobs[i].name`                                             | `job name "image" is a GitLab global keyword`                   |
| Job name starts with `.`               | `$.jobs[i].name`                                             | `job name ".template" is a hidden template, not a job`          |
| Empty stage name in `stages`           | `$.stages[i]`                                                | `stage name must not be empty`                                  |
| Duplicate stage name                   | `$.stages[i]` for each occurrence                            | `duplicate stage "test": $.stages[1] and $.stages[3]`           |
| Job's effective stage is not available | `$.jobs[i].stage`, or `$.jobs[i]` when the stage is implicit | `job "lint" uses stage "check", which is not declared`          |
| Empty script string                    | `$.jobs[i].script`                                           | `script must not be empty`                                      |
| Empty script array                     | `$.jobs[i].script`                                           | `script must contain at least one command`                      |
| Raw key collides at pipeline level     | `$.raw["stages"]`                                            | `raw key "stages" is already emitted at this level`             |
| Raw key collides at job level          | `$.jobs[i].raw["script"]`                                    | `raw key "script" is already emitted at this level`             |
| Raw value is not a record              | `$.raw` or `$.jobs[i].raw`                                   | `raw must be a plain record of keys to values`                  |

The reserved job-name set is GitLab's global keywords: `default`, `include`, `stages`, `variables`,
`workflow`, `spec`, `image`, `services`, `cache`, `before_script`, `after_script`.

### Stage semantics

- The available stages are `pipeline.stages` when defined, otherwise GitLab's defaults
  `[".pre", "build", "test", "deploy", ".post"]`.
- A job's effective stage is `job.stage` when defined, otherwise `test`.
- `.pre` and `.post` are always available for a job's `stage`, whether or not they appear in
  `stages`; they are not required to be listed.
- Membership is checked for explicit and implicit stages alike, so a pipeline that declares only
  `build` and `deploy` and omits `stage` on a job is refused instead of relying on an unavailable
  `test`.
- `stages` is emitted exactly as written; this slice does not reorder or inject `.pre`/`.post`.
- An empty `stages` array is not itself refused; the first job with an explicit or implicit stage
  fails membership instead.

### Corpus entry

- Repository: `gitlab-org/terraform-images`, MIT licence (LICENSE reads `Copyright (c) 2021
  GitLab.org`).
- Commit: `4230b972896ea9b4c23322855bcf76256e5ae1c9`, committed 2024-02-08, "Remove all unnecessary
  project files no longer required for maintenance".
- Path in that commit: `.gitlab-ci.yml`. Length: 113 lines. SHA-256 of the vendored bytes:
  `a23bae8c45f5c88036203ec1b396ed7a2185627751f875e4418014c21fc03c9a`.
- The file contains comments and blank lines, and it quotes several scalars the emitter would not
  choose. It is therefore compared as parsed data per ADR 0005, not byte for byte; provenance records
  `data`, not `byte-identical`.
- The fixture writes `workflow`, `variables` and the hidden `.terraform-versions` template through
  pipeline raw, and the four jobs' unmodelled keywords through job raw. `stages`, `stage` and
  `script` are modelled.
- The vendored file is never edited. A value the fixture cannot express is a ledger row, not a
  fixture fix.
- `PROVENANCE.md` records repo, commit, path, licence, the SHA-256 above, and the comparison mode.

## Testing Decisions

- **Seam.** One public seam: `render(pipeline(...))` from `@inoffensive/ci-cdk/gitlab-ci`, called as
  the composed expression a consumer writes. Corpus and golden tests use this call with the header
  suppressed; the header-on case uses the same call unchanged.
- **Second seam.** `toDoc(pipeline(...))` is public per ADR 0008 and gets exactly one structural test:
  jobs become map entries keyed by name in array order, `name` is absent from the body, and modelled
  keys appear before raw keys. It never substitutes for a bytes assertion.
- **A good test here** asserts emitted bytes or the parsed value of emitted text. It does not assert
  intermediate node kinds, styles or entry shapes, except in the single `toDoc` test above.
- **Golden convention.** `toMatchFileSnapshot` next to the provider, one golden per fixture, reviewed
  in diffs. The corpus test parses both sides with `yaml` and compares deeply; no normalisation of
  the vendored side.
- **Prior art.** `src/github-actions/render.test.ts`, `src/github-actions/jobs.test.ts`,
  `test/corpus/github-actions/coverage.test.ts` and `test/corpus/github-actions/*.test.ts`.
- **Determinism.** Two `render` calls on the same struct are byte-identical; core's determinism test
  already covers `renderDoc` across fresh module graphs.
- **Format lock.** The goldens pin the header line, LF endings, one trailing newline, no blank lines
  outside a block scalar, `stages` before jobs, and `[]` for an empty sequence.
- **Validation tests** assert `DiagnosticError` and the path, not the exact prose of every message.
  One test per condition in the diagnostics table, with duplicate-name reporting asserted for all
  occurrences.

## Out of Scope

- Every GitLab keyword not named above: `variables`, `default`, `include`, `workflow`, `image`,
  `services`, `cache`, `before_script`, `after_script`, `rules`, `only`/`except`, `needs`,
  `dependencies`, `artifacts`, `extends`, `tags`, `parallel`, `release`, `environment`, `trigger`,
  `retry`, `timeout`, `when`, `allow_failure`, `interruptible`, `resource_group`, `coverage`,
  `secrets`, `pages`, `spec`, `id_tokens`, `hooks`, `identity`, `manual_confirmation`, `run`,
  `start_in`, `dast_configuration`, `inherit`, and `!reference`.
- Typed leaves for GitLab. `${VAR}` needs none; a `!reference` leaf waits for `!reference` support.
- Schema conformance for GitLab. Vendoring GitLab's `ci.json` from the Rails repository at a pinned
  commit, and reconciling its strictness with emitted output, is the next slice; it is not part of a
  tracer bullet.
- A generated provider page under `docs/providers/`. The coverage table has no generator yet, so this
  slice updates the README status and the architecture's provider surface only.
- Multiple pipeline files, `include` resolution and cross-file references, per the architecture's
  non-goals.
- GitLab CI components, `spec` headers and inputs interpolation.

## Further Notes

- The tracker is local: tickets are files under `docs/tickets/`, and no issue is published. The
  `ready-for-agent` status line stands in for a triage label.
- `docs/architecture.md` says "Shell text (`run`, `script`) is a literal block scalar". That sentence
  describes GitHub Actions' `run` field and its opt-in `script` leaf, not a provider-neutral rule:
  GitLab's `script` field lowers strings without inferring a style. The docs ticket corrects the
  sentence to name the GitHub Actions field and leaf.
- The GitLab corpus file is data-only; do not add a byte-equality assertion for it. Byte equality is
  opt-in per entry (ADR 0005).
- The first ticket is deliberately the whole vertical path. Splitting types from lowering from
  rendering would produce three horizontal layers that cannot be verified on their own.
- `pnpm fmt` is run over this spec and the tickets before `pnpm check`, because the formatter's
  matched set grows with new files.
