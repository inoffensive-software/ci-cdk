# Spec 0003: GitHub Actions breadth, and the exhaustiveness gate

Status: ready-for-agent
Covers: build order step 7 in `docs/architecture.md`, and the "Provider done" definition it points at.
Respects: ADR 0001, ADR 0002 (D1-D6), ADR 0004, ADR 0006, spec 0001, spec 0002. Supersedes part of
ADR 0005 through ADR 0007, which is written by this work.

## Problem Statement

The provider has a vocabulary, two pinned corpus entries, document validation and a coverage ledger.
What it does not have is evidence that the vocabulary covers real GitHub Actions beyond the two shapes
it was built against. Neither entry runs a job in a container, declares a service, uses `run-name`,
defines a reusable workflow with inputs, or gives a matrix axis anything other than scalars. A
consumer with a semgrep job in a container, a Postgres service with ports, or `with: { fetch-depth: 0 }`
cannot write it: the first two have no field, and the third does not typecheck, because `with` values
are `Text`. Writing `"0"` compiles and emits a string where the upstream file has a number, so the
emitted workflow is not the workflow the consumer meant.

The gap is invisible from the outside. `raw` accepts any unmodelled key, so nothing fails when a
corpus fixture reaches for it, and nothing fails when a fixture simply omits a key it could not
express, because the corpus test compares data and a fixture is written by hand. The exhaustiveness
test that `docs/architecture.md` promises, the one that walks the corpus and reports what the DSL
cannot say, does not exist. Coverage debt is a hand-maintained ledger with two kinds of row, one of
which exists only because one entry is also compared byte for byte.

So "supports GitHub Actions" currently means "renders two specific files", and the distance between
that and "covers the grammar real configs use" is a number nobody can produce. Build order stops at
step 7, and step 7 cannot be measured.

## Solution

Make the corpus the measuring instrument it is described as, then widen the vocabulary until it needs
no `raw` at all:

- A test-only exhaustiveness gate that walks every vendored config, collects its key paths, and
  compares them with the set of key paths the DSL can actually emit. "Modelled" is measured, not
  declared: the inventory is one fixture that exercises every modelled key, rendered and parsed back.
  A corpus key outside that set fails the gate unless the entry's fixture expresses it through `raw`,
  in which case it is a declared, visible gap.
- Four new pinned entries chosen for the shapes the vocabulary cannot express today: services with
  ports, container jobs, `workflow_call` inputs, `run-name`, matrix rows that are objects, numeric and
  boolean `with` values.
- The vocabulary work those entries force: scalar-valued author maps, object matrix rows,
  `workflow_call` inputs, and the `run-name` key.
- One ledger row kind. Byte equality for `got` is retired, so the ledger is exactly the vocabulary-gap
  roadmap and an empty ledger is the definition of done.
- A provider document whose coverage table is generated from the gate, so the claim and the evidence
  cannot drift.

A consumer can then write a container job with a service, a reusable workflow with typed inputs, and a
`with` value that is a number, and get the file GitHub documents. A maintainer can say how much of
real GitHub Actions is covered, and point at the test that proves it.

## User Stories

1. As a library consumer, I want `with` values to accept numbers and booleans, so that `fetch-depth: 0`
   and `persist-credentials: false` emit the types the actions expect instead of strings.

2. As a library consumer, I want `env` values to accept numbers and booleans at workflow, job, step and
   container level, for the same reason.

3. As a library consumer, I want a matrix axis to hold objects, so that a build matrix of
   `{ host, target }` rows is expressible without a stringly-typed workaround.

4. As a library consumer, I want matrix scalars to stay numbers and booleans, so that `node-version`
   rows are not quoted.

5. As a library consumer, I want a workable probe: `with: { fetch-depth: 0 }` must render as a number
   and parse back as a number, not as `"0"`.

6. As a library consumer, I want a job that runs in a container to be expressible with `container`, so
   that a semgrep or code-scanning job does not fall back to `raw`.

7. As a library consumer, I want a job to declare services with an image, env and published ports, so
   that an integration test with Postgres is one struct.

8. As a library consumer, I want job-level `permissions` and `secrets: inherit` on a reusable-workflow
   job to be proven by a corpus entry, so that I am not relying on a field nobody has exercised.

9. As a library consumer, I want `on.workflow_call.inputs` with `type`, `default` and `required`, so
   that a reusable workflow's interface is typed rather than remembered.

10. As a library consumer, I want `workflow_call` inputs restricted to string and boolean, so that the
    type system does not accept a `choice` input the vendored schema will reject.

11. As a library consumer, I want `run-name` at workflow level, so that a run list is readable without
    reading the job names.

12. As a library consumer, I want `run-name` to accept an expression leaf, so that
    `${{ inputs.ref || github.ref_name }}` is expressible.

13. As a library consumer, I want the emitted `run-name` to appear directly after `name`, so that the
    file reads like the documentation.

14. As a library consumer, I want a workflow whose trigger list mixes a bare event, a filter-bearing
    event and a `workflow_call`, so that a real multi-entry workflow is one definition.

15. As a library consumer, I want `on.<event>` options I do not use to stay unmodelled rather than
    guessed, so that the types do not promise grammar the corpus has never seen.

16. As a library consumer, I want my job order, `needs` shape and key order preserved exactly as
    before, so that widening the vocabulary does not churn files I already emit.

17. As a provider author, I want one small inventory set that exercises every modelled key, so that
    "modelled" has a single, reviewable definition.

18. As a provider author, I want the inventory derived by rendering that fixture and parsing the
    output, so that the modelled set cannot drift from what `toDoc` actually emits.

19. As a provider author, I want the inventory fixture to use no `raw`, so that it cannot claim a key
    the vocabulary does not model.

20. As a provider author, I want the author-named maps listed in one place (`env`, `with`, `secrets`,
    `outputs`, `permissions`, matrix axes, service ids, job ids, event names, dispatch inputs), so
    that a corpus key under one of them is not mistaken for an unmodelled key.

21. As a provider author, I want a test that every declared author-named path actually occurs in the
    inventory, so that a typo in that list fails loudly instead of silently excluding a subtree.

22. As a provider author, I want the exhaustiveness gate to compare paths, not values, so that it
    reports grammar rather than data and does not duplicate the corpus test.

23. As a provider author, I want the gate to normalise sequence positions, so that a key in the third
    step of one job and the first step of another are the same modelled path.

24. As a provider author, I want the gate to fail with the unmodelled path and the two remedies
    (`model it`, or `express it through raw and declare it`), so that a failure is actionable without
    reading the test.

25. As a provider author, I want the gate's failure list sorted and de-duplicated, so that two runs
    over the same corpus produce the same output.

26. As a provider author, I want the gate to be provider-local test code, so that the second provider
    duplicates it rather than inheriting an abstraction built from one example (ADR 0002, D6).

27. As a maintainer, I want the gate to be proven non-vacuous, so that a green run means something: a
    corpus path outside the inventory with no `raw` row must fail, and `raw` on a key the inventory
    contains must also fail.

28. As a maintainer, I want the gate to run inside `pnpm check`, so that breadth cannot regress
    without a red build.

29. As a maintainer, I want every corpus key to be either modelled or declared, so that "supports
    GitHub Actions" is a claim with a test behind it.

30. As a maintainer, I want the ledger to have exactly one row kind, so that "the roadmap" and "a
    formatting device" are not the same list.

31. As a maintainer, I want `got` to be compared as data like every other entry, so that no entry
    carries a second, stronger assertion that forces `raw` on a modelled key.

32. As a maintainer, I want `got`'s round-trip to keep passing after that change, so that retiring
    byte equality does not quietly weaken its coverage.

33. As a maintainer, I want `PROVENANCE.md` to record the comparison level per entry, so that the
    strongest claim each entry supports is written down.

34. As a maintainer, I want four new entries pinned by commit and licence-recorded, so that
    redistribution stays attributable.

35. As a maintainer, I want each new entry to say why it is in the corpus, so that a future reader
    knows which shape it exists to prove.

36. As a maintainer, I want the entries to be vendored verbatim and never edited, so that a gap is
    never papered over.

37. As a maintainer, I want the ledger empty when this work is done, so that "done" is a single
    assertion rather than a judgement call.

38. As a maintainer, I want `docs/providers/github-actions.md` to exist with scope, coverage, corpus,
    quirks, non-goals and open gaps, so that the provider's claim lives where the template says it
    does.

39. As a maintainer, I want the coverage table generated from the gate and asserted for equality, so
    that the document cannot describe a provider that no longer exists.

40. As a maintainer, I want the open-gaps section to be the ledger, so that prose and test data are
    the same fact.

41. As the next agent implementing this, I want each corpus entry to be its own ticket that leaves the
    gate green for that entry, so that the work is verifiable in slices and a single fresh context can
    finish one.

42. As the next agent, I want each ticket to name the gaps it must close, so that I do not have to
    rediscover them from a failing test.

43. As the next agent, I want the spec to state that `raw` is allowed during a ticket and forbidden at
    the end, so that "temporary" has a deadline.

## Implementation Decisions

1. **The exhaustiveness gate is a test, not a feature.** It lives beside the corpus fixtures and reads
   the vendored files. It adds no export and no production module. Its two inputs are the corpus and
   the inventory, and its output is a failure listing unmodelled paths.

2. **"Modelled" is derived behaviourally.** The inventory is a small set of definitions, not one
   document: shapes that cannot coexist in a single workflow each get their own, namely `on` as a
   string, a sequence and a map; `permissions` as a token and as a map; and the two arms of
   `environment`, `concurrency`, `needs`, `runs-on` and `secrets`. Everything that can coexist stays
   in one document, so the set stays small and reviewable. The gate renders each definition with
   `{ header: "" }`, parses the output, and unions the key paths. A key the vocabulary gains but the
   inventory does not exercise is a false gap, which the gate reports and the implementer fixes by
   extending the inventory; a key the inventory contains but the vocabulary cannot emit is
   impossible, because the inventory is lowered by the same `toDoc` a consumer uses.

3. **The inventory uses no `raw`.** A test asserts no inventory document names `raw`, so the
   inventory cannot claim grammar the vocabulary lacks. Each document is also schema-checked like
   every other emitted document.

4. **Key paths are structural, not positional.** A map key is kept; a sequence position is `[]`. So
   `jobs.<id>.steps[].with.<name>` is one path regardless of which job or which step index used it,
   and adding a step does not change the inventory.

5. **Author-named map children are wildcards.** Some map keys are the author's, not the provider's:
   job ids, `env` names, `with` names, `secrets` names, `outputs` names, permission scopes, matrix
   axes, service ids, event names under `on`, and dispatch/`workflow_call` input names. A single
   declared list names each of those parent paths; a child under one of them normalises to `*`. This
   is the only declared vocabulary in the gate, and a test asserts each declared path actually occurs
   in the inventory.

6. **The corpus set difference is the assertion.** For every entry, `corpusPaths - inventoryPaths`
   must equal the raw paths that entry's fixture declares, expressed as modelled paths. Every such
   path is a vocabulary gap. There is no second category: at the end of this work the difference is
   empty and the ledger is empty.

7. **`raw` on a modelled key is a failure.** Once byte equality is retired, there is no reason for a
   fixture to reach for `raw` on a key the inventory contains, and allowing it would let an entry
   dodge a gap. This is the negative case that proves the gate is not vacuous.

8. **Byte equality is retired; one ledger row kind remains.** `got` compares as data like `anyhow`.
   Its two `raw.run` steps become modelled `run` steps (literal blocks), its byte assertion and the
   two `RUN_STYLE_REASON` rows are deleted, and `PROVENANCE.md` records `data` for both entries. ADR
   0007 records this, supersedes the "byte equality is retained where an entry already achieves it"
   clause of ADR 0005 and the two-class row description in the corpus README and the ledger's
   docstring. Everything else in ADR 0005 stands.

9. **`Scalar` is a provider-local alias.** `Text` stays `string | LeafNode` for keys whose value is
   always text (`name`, `if`, `run`, `uses`, `image`, concurrency groups, environment names and urls).
   Author maps whose values are arbitrary YAML scalars (`with`, `env`, `container.env`, matrix
   values) accept `Scalar = string | number | boolean | LeafNode`. The alias lives in the provider,
   not in core: two providers wanting it is not three, and core gains no vocabulary (ADR 0002, D6).

10. **Matrix axes accept scalars or flat records of scalars.** `MatrixValue` widens to
    `Scalar | Readonly<Record<string, Scalar>>`, so an axis can be `[20, 22]` or
    `[{ host, target }]`. Records lower through the boundary parser, so author key order survives and
    a `Date` or a function is rejected with a path rather than emitted. A row that omits a key omits
    it; there is no filling in of absent members.

11. **`strategy.matrix.include` and `exclude` stay unmodelled.** No pinned entry uses them. They stay
    a declared non-goal until a corpus entry does, per the corpus-first rule in
    `docs/providers/README.md`.

12. **`workflow_call` accepts typed inputs, and only inputs.** The options struct takes
    `inputs?: Record<string, WorkflowCallInput>`, where `WorkflowCallInput` is the string and boolean
    arms of the existing `Input` union with `description`, `required` and `default`. `choice` and
    `environment` are `workflow_dispatch`-only, and `number` is not modelled, because the vendored
    schema allows it and no entry needs it. `outputs` and `secrets` on `workflow_call` stay unmodelled
    for the same reason. An options object with no keys still lowers to `null` (ADR 0006).

13. **`run-name` is a `Workflow` field of type `Text`, emitted after `name`.** It is the only new
    top-level key. Order is `name`, `run-name`, `on`, `permissions`, `env`, `defaults`, `concurrency`,
    `jobs`.

14. **One new field does not reorder anything else.** No existing key moves. ADR 0004's order stands,
    and JSON-free fixtures keep their current output, so the change is additive for every consumer
    who does not use the new keys.

15. **Four entries, pinned by commit, all permissively licensed, each with a recorded reason.** The
    corpus gains:
    - `trpc/trpc`, `.github/workflows/main.yml` at `708753ff1383c47c5f765694978db1000a86ee36`
      (MIT): services with env and a published port, a matrix of scalar axes, `continue-on-error`,
      workflow `concurrency`, `on.pull_request.types`, bare `merge_group`, `on.push.branches`, and
      numeric `with` values.
    - `trpc/trpc`, `.github/workflows/release.yml` at the same commit (MIT): `workflow_dispatch`
      choice inputs with defaults and options, `environment`, a workflow `permissions` map, and
      `on.push.paths` including negated patterns.
    - `vercel/turborepo`, `.github/workflows/lsp.yml` at
      `e158e859f804019fa48dd1af15bc247e4759d81e` (MIT): `run-name`, `workflow_call` inputs,
      matrix rows that are objects, boolean `with` values, job `outputs`, `environment`, `shell`,
      `working-directory`, and `if` conditions reading `inputs`.
    - `prisma/prisma`, `.github/workflows/pr-code-security.yml` at
      `1143e9310013a10c8d7f8a100491e844545320c2` (Apache-2.0): a container job, job-level
      `permissions`, `secrets: inherit` on a reusable-workflow job, and a numeric `with` value.
      Two entries from one repository is deliberate: `main.yml` and `release.yml` exercise disjoint
      shapes, and the corpus rule is one fixture per shape, not one per repository.

16. **Each entry's ticket closes the gaps that entry exposes.** A ticket may add a ledger row with a
    reason and leave `raw` in place while the vocabulary work in that same ticket is unfinished, but
    it may not merge with a row it could have closed. The final ticket asserts the ledger is empty.

17. **The provider document is generated, not written twice.** `docs/providers/github-actions.md`
    follows the template in `docs/providers/README.md`. Its coverage table is produced from the gate's
    data by one function, and a test compares the table in the document with that function's output.
    Updating the table by hand cannot pass.

18. **No core change, and no new public export.** Every decision above is provider-local. The gate is
    test code, `Scalar` is a provider alias, and `run-name`, `workflow_call.inputs` and object matrix
    rows are lowering of provider vocabulary into the existing `Doc`.

19. **Vendored files are never edited, and fixtures translate literally.** Where a file writes a
    number, the fixture writes a number. Where it writes a boolean, the fixture writes a boolean. A
    fixture that would need `raw` for a modelled key is a signal that the modelled set or the fixture
    is wrong, not a licence to widen `raw`.

## Testing Decisions

A good test here asserts something a consumer can observe: emitted data, a thrown diagnostic, or the
gate's verdict over the corpus. It does not assert the shape of a struct, the name of a private
helper, or the order of keys the format contract does not fix. The corpus tests compare parsed data
(ADR 0005), so quoting, blank lines and key order are not asserted; types are, because a quoted `"0"`
and the number `0` are different data.

Seams, all existing or test-only:

- `render(workflow, options)` on the provider barrel is the primary seam. Every corpus entry, every
  widened field and every schema check asserts here.
- `toDoc(workflow)` is the secondary seam, used only where a byte or data diff cannot say which stage
  was wrong: the new `run-name` position and the object matrix rows.
- The exhaustiveness gate is a new test-only seam over the corpus directory. It is the seam that
  measures breadth, and it is the only place in the suite that asserts a statement about the corpus as
  a whole rather than about one fixture.

Modules tested:

- `src/github-actions/` through the barrel: the widened `Scalar` maps, object matrix rows,
  `workflow_call.inputs`, and `run-name`, each with one passing and one boundary-rejecting case.
- `test/corpus/github-actions/`: the six entries, the inventory fixture, the ledger, and the gate.
- `test/schemas/`: every emitted fixture, including the inventory fixture, validates against the
  vendored schema.
- `docs/providers/github-actions.md`: the coverage table is asserted equal to the generated table.

Prior art:

- `test/corpus/github-actions/coverage.test.ts` for set equality in both directions.
- `test/corpus/github-actions/anyhow.test.ts` and `got.test.ts` for the data-comparison idiom.
- `test/corpus/github-actions/provenance.test.ts` for asserting the provenance record matches the
  vendored bytes.
- `src/core/diagnostics.test.ts` for asserting `{ path, message }` sets rather than formatted strings.
- `src/github-actions/raw.test.ts` for the "boundary refuses this value, with a path" cases.

Specific decisions:

- The gate is proven non-vacuous by three negative cases: a synthetic corpus path outside the
  inventory with no `raw` row fails; a fixture that uses `raw` for an inventory key fails; a declared
  ledger row that no fixture uses fails (already). A gate that cannot fail is not evidence.
- The gate's report is sorted and de-duplicated, and asserted as a set of paths, not as a message
  string.
- The inventory set is asserted to be `raw`-free, and every document it contains renders to something
  that validates against the vendored schema.
- Every declared author-named map path is asserted to occur in the inventory, so the wildcard list
  cannot rot silently.
- `got` keeps an explicit test that it still round-trips after the byte assertion is removed, so
  retiring the stronger check does not hide a regression.
- The final ticket adds a named test asserting the ledger is empty, so "no vocabulary gaps" is a
  red/green fact and not a paragraph.

## Out of Scope

- `strategy.matrix.include` and `exclude`.
- `workflow_call.outputs`, `workflow_call.secrets`, `number` inputs, and `choice`/`environment`
  inputs on `workflow_call`.
- Event option structs beyond `pull_request` and `workflow_call`: `repository_dispatch.types`,
  `release.types`, `issues.types`, `workflow_run.workflows`, and the other per-event filters.
- `runs-on` as `{ group, labels }`.
- Extraction of a shared corpus or gate helper into core or a shared test module. The second provider
  duplicates them (ADR 0002, D6).
- GitLab CI, Bitbucket Pipelines, any second provider.
- Schema refresh, and any change to the vendored schema.
- Expression parsing or validation. `expr` remains opaque text.
- Byte-level fidelity for any entry, and any new `Doc` style.
- A CLI, file discovery, or writing files.
- A provider document for any provider other than `github-actions`.

## Further Notes

"Nothing unmodelled" is relative to the six pinned entries. Adding a seventh reopens the question by
design; that is what makes the claim measurable rather than absolute. The ledger is the honest place
to record the reopening.

ADR 0004's rationale was byte equality, which this spec retires for `got`. Its decision, that the
corpus's key order wins over the documented order, still holds and is unaffected: emitted order is
fixed, and the corpus no longer constrains it. No successor record is needed, but the next reader
should not treat its byte-equality premise as live.

The working tree already carries a widening of `runs-on` to `readonly string[] | Text`, with tests.
That change is not part of this spec's tickets; it is assumed landed, and the inventory fixture should
exercise all three arms.

The gate compares key paths, not leaf types, so a corpus key the vocabulary models with the wrong
scalar type (a number where the struct says `Text`) is caught by the corpus data comparison rather
than by the gate. That division is deliberate: the gate measures grammar, the corpus measures values.
