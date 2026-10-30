# Spec 0002: The GitHub Actions provider

Status: ready-for-agent
Covers: build order steps 4, 5 and 6 in `docs/architecture.md`.
Respects: ADR 0001, ADR 0002 (D1-D6), spec 0001.

## Problem Statement

Core can turn a `Doc` into byte-stable YAML, but nothing in the package knows what a workflow is.
The `github-actions` subpath is already declared in the package exports and already shown in the
README, so a consumer who follows the documentation gets a module that does not exist. There is no
`render`, no `workflow`, no `job` and no `step`.

This matters because the package's central claim is that provider vocabulary can be typed and then
lowered without losing provider warts. That claim is untested until a real provider exists. GitHub
Actions is the right first one: it has the largest grammar, it is the provider most consumers use,
and it forces the two shapes core was designed around, a job map that the author writes as an array,
and expression-bearing strings that must never be emitted as plain scalars.

A consumer today can write YAML by hand and get every typo at pipeline runtime. They cannot get
`runs-on` misspelled, `needs` pointing at a job that does not exist, or two jobs with the same id
caught before the file is written.

## Solution

Ship one provider module that takes typed structs to text through the existing pipeline:

- A vocabulary of GitHub Actions structs, using GitHub's own key names.
- Four leaves that carry their own scalar style: `expr`, `script`, `matrix` and `needs`.
- One lowering function that turns a workflow struct into a `Doc`, in declared key order.
- Document-level validation in that same lowering pass: duplicate job ids, dangling `needs` edges,
  and dependency cycles.
- A `render` that composes lowering and `renderDoc`, so the happy path is one call.
- A `raw` escape hatch so a key the vocabulary does not model can still be expressed and counted as
  coverage debt.
- Two real, pinned, permissively licensed configs reproduced byte for byte with the generated
  header suppressed.

A consumer can import `render`, `workflow`, `job` and `step` from the subpath, write the README
example as written, and get a valid workflow file. A provider author gets a worked example of every
layer, and the next provider has a template rather than a blank directory.

## User Stories

1. As a library consumer, I want to import `render`, `workflow`, `job` and `step` from
   `@inoffensive/ci-cdk/github-actions`, so that the README example is real code and not an
   aspiration.

2. As a library consumer, I want `workflow({ name, on, jobs })` to return a plain struct, so that I
   can build it inline or in a shared function without a builder lifecycle.

3. As a library consumer, I want `job({ id, "runs-on", steps })` to keep `id` on the struct, so that
   composition and array literals stay simple.

4. As a library consumer, I want the job array lowered to a map keyed by `id`, so that the emitted
   file matches what GitHub documents.

5. As a library consumer, I want job order to follow array order, so that two runs of the same
   definition produce the same file.

6. As a library consumer, I want a duplicate job id to fail the render with a diagnostic naming both
   positions, so that composition of shared jobs cannot silently drop one.

7. As a library consumer, I want `needs` to accept one id or an array, so that I do not write a
   one-element array for a single dependency.

8. As a library consumer, I want `needs` pointing at an unknown job to fail with a diagnostic naming
   the referencing job and the missing id, so that the typo is found before the file is committed.

9. As a library consumer, I want a `needs` cycle to fail with a diagnostic that lists the cycle, so
   that I can see which jobs form the loop.

10. As a library consumer, I want `on` to accept a single event name, an array of event names, or a
    map of event to options, so that the three shapes GitHub accepts are all expressible.

11. As a library consumer, I want `push` and `pull_request` filters (`branches`, `branches-ignore`,
    `paths`, `paths-ignore`, `tags`, `tags-ignore`, `types`) as arrays, so that a monorepo filter
    reads like the GitHub documentation.

12. As a library consumer, I want `schedule` as a list of cron entries, so that a nightly job is one
    field.

13. As a library consumer, I want `workflow_dispatch` to accept typed inputs (string, boolean,
    choice, environment, with description, required and default), so that manual runs are typed
    rather than remembered.

14. As a library consumer, I want `workflow_call` to be expressible as a bare event name, so that a
    reusable workflow's trigger exists even though its inputs and outputs are not modelled yet.

15. As a library consumer, I want `permissions` as `read-all`, `write-all`, or a map of scope to
    level, so that the common least-privilege shape is one object.

16. As a library consumer, I want `env` at workflow, job and step level as a map of name to text, so
    that values can be plain strings or expressions.

17. As a library consumer, I want `defaults.run` (`shell`, `working-directory`) at workflow and job
    level, so that a repository-wide shell choice is written once.

18. As a library consumer, I want `concurrency` as a string or as `{ group, cancel-in-progress }`, so
    that both documented forms are expressible.

19. As a library consumer, I want `runs-on` as a string, an array of strings, or an expression, so
    that hosted runners, self-hosted label sets and matrix-driven targets all work.

20. As a library consumer, I want `if` as a string or an expression leaf, so that a condition is not
    double-quoted when I wrote a valid plain condition.

21. As a library consumer, I want `strategy.matrix` as a map of axis to a list of strings, numbers or
    booleans, so that `node-version: [20, 22]` emits numbers and not strings.

22. As a library consumer, I want `strategy.fail-fast` and `strategy.max-parallel` typed as boolean
    and number, so that they emit as YAML booleans and numbers.

23. As a library consumer, I want `timeout-minutes` and `continue-on-error` typed, so that `10` and
    `true` are not accidentally strings.

24. As a library consumer, I want `environment` as a string or `{ name, url }`, so that a deployment
    target and its URL are both expressible.

25. As a library consumer, I want `container` and `services` as typed structs (image, credentials,
    env, ports, volumes, options), so that a job that runs in a container does not fall back to
    `raw`.

26. As a library consumer, I want a job that calls a reusable workflow to accept `uses`, `with` and
    `secrets` instead of `steps`, so that both job kinds share one `Job` type.

27. As a library consumer, I want a job that has both `steps` and `uses` to fail with a diagnostic, so
    that an invalid combination cannot reach the file.

28. As a library consumer, I want a step that has both `run` and `uses` to fail with a diagnostic,
    for the same reason.

29. As a library consumer, I want `run` text emitted as a literal block scalar, so that a multi-line
    shell script keeps its newlines and indentation.

30. As a library consumer, I want `expr` tagged-template interpolation to emit a double-quoted
    `${{ ... }}` scalar, so that an expression containing `: ` or ` #` is never invalid YAML.

31. As a library consumer, I want `script` to return a literal-block leaf, so that a shared shell
    snippet can be composed and still emit correctly wherever it is used.

32. As a library consumer, I want `matrix("node-version")` and `needs("build", "digest")` helpers, so
    that the two most common expressions do not need a template literal.

33. As a library consumer, I want `with`, `env`, `outputs` and `secrets` to preserve the order I
    wrote, so that emitted files diff cleanly against what I authored.

34. As a library consumer, I want a workflow containing a key the vocabulary does not model to be
    expressible through `raw`, so that I am never blocked by an incomplete provider.

35. As a library consumer, I want `raw` to accept only `Value`, so that a function or a `Date` is
    rejected at the boundary with a path, not emitted as garbage.

36. As a library consumer, I want `render(workflow)` to prepend the standard header, so that the file
    says it is generated.

37. As a library consumer, I want `render(workflow, { header: "" })`, so that I can emit a file with
    no header when I need exact bytes.

38. As a library consumer, I want the emitted file to validate against the vendored GitHub workflow
    schema, so that a key the schema rejects is caught in the library's tests.

39. As a library consumer, I want `toDoc` exposed, so that I can inspect the ordered, styled tree when
    debugging a surprising emission.

40. As a library consumer, I want diagnostics to use the same `$`/`.key`/`["key"]`/`[0]` paths as the
    core boundary parser, so that I do not learn two notations.

41. As a provider author, I want every struct field typed with GitHub's key name, so that
    autocomplete and the GitHub documentation agree.

42. As a provider author, I want `Text = string | LeafNode` accepted wherever a value can be an
    expression, so that a leaf can be passed without a cast.

43. As a provider author, I want builders to be near-identity and never validate, so that a builder
    call cannot throw and composition stays plain JavaScript.

44. As a provider author, I want one lowering function and one validation site, so that the rule that
    only a whole document is validated stays true.

45. As a provider author, I want the provider to import core and nothing else, so that the zone rules
    keep providers independently replaceable.

46. As a maintainer, I want two real configs reproduced byte for byte at pinned commits, so that
    "supports GitHub Actions" means something measurable.

47. As a maintainer, I want the corpus entries to record repo, commit and licence, so that
    redistribution is attributable.

48. As a maintainer, I want every `raw` block in a corpus fixture listed in a coverage-debt ledger,
    so that the remaining gap is a number and not a feeling.

49. As a maintainer, I want the emitted schema check and the corpus check to run in the normal test
    suite, so that neither needs a separate command.

## Implementation Decisions

1. **Module split.** The provider is six modules behind one barrel: `types`, `leaves`, `to-doc`,
   `validate`, `render`, `index`. The barrel re-exports and declares nothing. `index` is the only
   module the package export points at.

2. **Structs are plain readonly objects with GitHub's key names.** No getters, no methods, no class
   instances, no camelCase translation. `readonly "runs-on"`, `readonly "continue-on-error"`,
   `readonly "timeout-minutes"`. A field that accepts an expression is `Text`, where
   `Text = string | LeafNode`, the alias imported from core.

3. **Maps versus arrays.** A map whose keys the consumer chooses and whose order carries no meaning
   for lookup (`env`, `with`, `outputs`, `secrets`, permissions scopes, matrix axes) is
   `Readonly<Record<string, T>>` and is emitted in insertion order. A collection the consumer
   refers to by identity (`jobs`, `steps`) is a readonly array, because lowering needs to inspect
   every member and because duplicate ids are a diagnostic, not a last-wins overwrite.

4. **`jobs` is an array of `Job`; `Job` carries `id`.** Lowering strips `id` from the emitted map and
   uses it as the key. This is the D4 consequence: an array is what spread and concat can compose,
   and only lowering sees the whole document.

5. **`needs` accepts `string | readonly string[]`.** Lowering preserves the author's shape: a string
   lowers to a scalar, an array to a sequence. It does not normalise a one-element array to a string.

6. **Four leaves, all returning `LeafNode`.** They are the only things in the provider that decide a
   scalar style:
   - `expr` interpolates a template literal into `${{ ... }}` and returns a `double`-quoted scalar.
   - `script` returns a `literal` block scalar.
   - `matrix(key)` returns the same node shape as `expr` for `${{ matrix.<key> }}`.
   - `needs(id, output)` returns the same node shape as `expr` for
     `${{ needs.<id>.outputs.<output> }}`.
     `matrix` and `needs` are sugar over `expr`; they exist because these two expressions are the
     common case and getting the path wrong is a silent runtime failure.

7. **Builders are near-identity inference anchors.** `workflow`, `job` and `step` return their input
   unchanged apart from the type they pin. They do not validate, merge, default or clone.

8. **Lowering emits in declared key order, not input key order.** Each struct has a fixed field
   order, matching the order GitHub documents, so two definitions that differ only in property
   order emit identical bytes. A field whose value is `undefined` is treated as absent and is not
   emitted. This is a lowering rule, not a relaxation of the boundary parser, which still rejects
   `undefined` in data it receives.

9. **Numbers and booleans go through `fromValue`.** Typed leaves of the struct are lowered by the
   boundary parser, so `timeout-minutes: 10` and `fail-fast: false` enter the `Doc` as typed scalars
   with the core tags, not as text. This keeps the one rule that text never decides a type.

10. **Validation runs in `to-doc` and nowhere else.** Four checks, all whole-document:
    - duplicate job ids, reported at both paths;
    - a `needs` entry naming a job that does not exist;
    - a `needs` cycle, reported with the members in order;
    - a job with both `steps` and `uses`, and a step with both `run` and `uses`.
      All problems in one call are collected and thrown as a single `DiagnosticError`, as in core.

11. **Diagnostic paths follow the core notation.** `$.jobs[2].id` for a duplicate, `$.jobs[0].needs[1]`
    for a dangling edge, `$.jobs[1].steps[3]` for a step with two bodies. Keys that are not
    identifiers use bracket-quoted form, exactly as `fromValue` does.

12. **`on` is a union of three shapes.** `string`, `readonly string[]`, or a `Triggers` object. The
    event names are a closed union of the documented events. Each option key is spelled as GitHub
    spells it (`branches-ignore`, `paths-ignore`, `tags-ignore`). `workflow_dispatch.inputs` is a map
    of `Input` structs with a `type` union of `string | boolean | choice | environment`. `schedule` is
    `readonly { cron: string }[]`.

13. **`raw` is `Readonly<Record<string, Value>>` on `Workflow`, `Job` and `Step`.** Lowering appends
    raw entries after modelled keys, in insertion order, through `fromValue`. `Value` is imported from
    core, so the escape hatch is the only place provider data crosses a boundary, and it is checked
    like any other boundary data.

14. **Coverage debt is declared, not inferred.** A corpus fixture lists the `raw` paths it needed in
    one table shared by the corpus tests. The table is the roadmap; adding to it is a deliberate
    change, and removing from it is the definition of closing a gap. This is cheaper and more honest
    than trying to detect at runtime which keys a struct did not model, which it cannot: the struct
    has already erased that information.

15. **`render` is lowering plus the existing emitter.** `render(workflow, options?)` is
    `renderDoc(toDoc(workflow), options)`. It adds no options of its own. `header` is forwarded
    unchanged, so `{ header: "" }` is how a corpus fixture gets exact bytes.

16. **`toDoc` is public on the provider subpath.** It is the second seam and the debugging surface.
    This widens the provider surface described in `docs/architecture.md`, so an ADR records the
    addition and names the architecture line it changes.

17. **The corpus entries are comment-free and blank-line-free by selection, not by editing.** The
    format contract permits one comment and no blank lines, so a config with either cannot reproduce
    byte for byte and is not a corpus entry. Two entries qualify, both MIT:
    - `sindresorhus/got`, `.github/workflows/main.yml` at
      `66d0623ae0bf88a5158e08885e031184f26965c0`
    - `chalk/chalk`, `.github/workflows/main.yml` at
      `72110019e147683f60e13fa0ff5c14a0c27cd9fe`
      Both use `on` as a sequence, a matrix with numeric axis values, a `name` containing expressions,
      and `permissions`. Between them they exercise the shapes this spec calls in scope.

18. **The upstream schema is vendored and checked with a validator.** `test/schemas/github-actions.json`
    is a pinned copy of the schema named in `docs/references/upstream-schemas.md`. It is draft-07 and
    self-contained. `ajv` is added as a dev dependency at an exact version and configured to accept
    draft-07 without strict mode, because the vendored schema is community-maintained and has
    loose unions. Refresh is manual.

19. **No core change is required.** Nothing in this spec adds provider vocabulary to `src/core/`, and
    the existing zone rules already declare the provider zone and its single allowed import.

## Testing Decisions

A good test here asserts emitted text or a thrown diagnostic through a public export. It never
reaches into a private function, never asserts the internal shape of a struct, and never pins key
order that the format contract does not promise. Structure is asserted only where the contract is
structural: the `toDoc` seam, and the diagnostic paths.

Two seams, both public:

- `render(workflow, options)` from the provider barrel. This is the primary seam. Goldens, corpus
  byte-equality, schema conformance and validation errors all assert here, because all of them are
  observable as text or as a throw from one call.
- `toDoc(workflow)` from the provider barrel. This is the secondary seam, used for one structural
  test: that declared key order, `jobs`-array to map lowering, and leaf styles are what the
  emitter receives. It exists because a byte diff says a file is wrong but not which stage
  produced it.

Modules tested:

- The provider barrel, through the two seams above.
- The corpus fixtures, each as its own test next to the vendored config, comparing `render` output
  with `{ header: "" }` to the file bytes.
- The schema check, over the same emitted fixtures, so schema conformance is proven on real shapes
  rather than a toy document.

Prior art:

- `src/core/emission.test.ts` for `toMatchFileSnapshot` goldens and the header-on/header-off pair.
- `src/core/diagnostics.test.ts` for asserting `DiagnosticError.diagnostics` paths and messages.
- `src/core/determinism.test.ts` for the two-render byte-equality idiom.
- `test/corpus/README.md` for fixture layout, provenance and selection rules.

Specific decisions:

- Goldens live under the provider's `__snapshots__` directory and are reviewed in diffs.
- Diagnostics are asserted as a set of `{ path, message }` pairs, not as a whole formatted string,
  so a wording change does not fail a path assertion.
- Every validation check has a passing and a failing case, and the failing case asserts that one call
  reports every problem it can see, not just the first.
- The corpus test reads the vendored file and compares strings, so a trailing-newline or CRLF
  difference fails rather than being normalised away.
- The coverage-debt ledger is asserted to be exactly the set of `raw` paths present in the fixtures,
  in both directions, so a fixture that starts using `raw` without declaring it fails.

## Out of Scope

- Breadth beyond the two corpus entries. More entries, and the exhaustiveness report over a larger
  corpus, are build order step 7.
- A corpus entry with a `needs` graph, because no comment-free, permissively licensed candidate was
  pinned in this spec. The needs validation is covered by provider tests until such an entry exists.
- `strategy.matrix.include` and `exclude`.
- `on.workflow_call` inputs, outputs and secrets.
- Parsing, type-checking or validating expression contents. `expr` is opaque text by design, and the
  same is true of `matrix` and `needs`.
- YAML anchors, merge keys, comments and blank lines in output.
- GitHub Enterprise Server specific keys.
- A CLI, file discovery, drift detection, or writing files. `write` from core remains the consumer's
  call.
- Schema refresh automation and dependency-bump tooling.
- GitLab CI and Bitbucket Pipelines.

## Further Notes

The corpus rule and the format contract pull in opposite directions, and this spec resolves it
explicitly: a corpus entry is reproduced with the header suppressed, so "byte for byte" means the
upstream body, not a file that GitHub would also accept with our comment prepended. This should be
stated once in the corpus README as part of this work, because the next person will assume otherwise.

Provider "done" in `docs/architecture.md` is not reached by this spec. Two entries and a declared
debt ledger are the first measurable point on the way, not the finish line.

`on` as a key is already handled by core: it is emitted plain, and a plain scalar `on` is not quoted
by the pinned `yaml` version. No provider special case is needed, and none should be added.
