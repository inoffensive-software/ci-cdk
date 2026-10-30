# 0014: a job's `script` is optional, and an omitted `stage` is not checked

**Status:** Accepted

**Supersedes:** the "unavailable explicit or implicit stage" clause of spec
`docs/specs/0006-gitlab-ci-breadth.md` (Semantics and diagnostics). It supersedes no ADR; the four
exports and three types of ADR 0008 are unchanged.

## Context

`Job.script` was required, and `validate` treated an omitted `stage` as GitLab's `test` default and
required that stage to be declared. Both assumptions hold for a whole pipeline and fail for a
fragment, which is what a real `.gitlab-ci.yml` often is.

The corpus entry for `gitlab-org/labkit` (ADR 0007's comparison, ticket 37) is such a fragment:

- `include` pulls in `common-ci-tasks` templates and a local versions file, so many of its jobs are
  defined elsewhere.
- Thirteen jobs declare no `script`: eight only override `rules` to `when: never` on a job the
  template defines, three redis variants inherit `script` through `extends: .integration-redis-base`,
  `markdownlint` only sets `needs`, and `conformance-spec` is a `trigger:` job, which GitLab runs
  without a script.
- The same jobs, and `release-v1`/`release-v2` through `extends: .release-base`, declare no `stage`.
  `stages` in the fragment is `prepare`, `validate`, `release`, `renovate_bot` - no `test`.

GitLab merges includes and `extends` by job name at pipeline creation, and the merged job is what is
validated there. Neither resolution happens here: ADR 0008 and spec 0006 make `include`, `extends`
and `!reference` emit-only. A required `script` therefore rejects a config GitLab accepts, and the
implicit-`test` check rejects one on a stage the merge supplies.

`raw` cannot absorb either case. `script` and `stage` are reserved job keys, so `raw` is refused
there by design (a job must not carry two sources for one keyword), and every job written through
pipeline `raw` would bypass the typed layer entirely - the exhaustiveness gate normalises root keys
to `$.*` and could not tell such a job from a keyword.

## Decision

A job may omit `script`, and validation only checks a stage it was given.

- `Job.script?: Script`. An absent `script` lowers to no key at all; it is not defaulted, not
  synthesised and not recorded. `name` stays the struct identity, and the raw reservations keep
  `name`, `stage` and `script`, so a scriptless job cannot smuggle a script through `raw`.
- An empty string or an empty array is still refused, with the existing diagnostics. Absent means
  "the merge supplies it"; empty means "no commands", which is a mistake in either reading.
- Stage membership is checked only for a job that declares `stage`. An omitted stage is not compared
  against `stages` at all, because `extends` or an include may supply it. Every other diagnostic is
  unchanged.
- Validation does not pretend to resolve includes. It cannot know whether a scriptless job merges
  with an included one, and it does not claim to.

## Consequences

- `Job` widens: source-compatible for authors, breaking for a consumer that read `script` as
  non-optional (a `.length` on it now needs a guard). The emitted output is unchanged for every
  definition that declares `script`.
- A job with neither `script` nor `raw` is expressible and renders as an empty map. If no included
  job supplies a script, GitLab rejects the merged pipeline; that is a merge-time error the library
  cannot see, and it is no longer pretended to be caught at build time.
- The fragment in the corpus now reproduces as data, and the exhaustiveness gate gains nothing to
  model from the change: an absent script emits no key path.
- A pipeline that omits `test` from `stages` and gives no job a `stage` no longer fails here. GitLab
  still fails it at creation if nothing supplies the stage, so the check moves later rather than
  disappearing.
- `docs/specs/0006-gitlab-ci-breadth.md`'s diagnostics list is narrowed to an unavailable explicit
  stage.

## Alternatives

- **Write whole jobs through pipeline `raw`.** Rejected: it bypasses the typed layer, the reserved
  keys stop applying, and the gate cannot map a root raw key to a job, so every modelled key inside
  such a job would go unchecked.
- **A sentinel empty script (`script: ""` or `script: []`).** Rejected: it changes the data - the
  file has no `script` key - and empty is exactly the value validation refuses.
- **Keep `script` required and fill it from `extends` within the document.** Rejected: it only covers
  extends targets in the same file, resolves a reference the provider deliberately does not resolve,
  and does nothing for the eight override jobs that come from an include.
- **Keep the implicit-`test` stage check and declare a stage on each corpus job.** Rejected: it edits
  the vendored data to fit the vocabulary, which the corpus rules forbid; the gap is real.
