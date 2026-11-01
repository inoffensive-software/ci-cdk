# 0017: `run` is a job's alternative to `script`, not an addition

**Status:** Accepted

**Supersedes:** nothing. It extends ADR 0014 (a job's `script` is optional) without changing it: an
absent `script` still means "the merge supplies it", and the new field does not make `script` required.

## Context

GitLab Functions replaces a job's shell commands with a list of typed steps. The `run` keyword is the
job-level entry point, and GitLab's CI/CD YAML reference states the relationship plainly: use either
`run` or `script` in a job, but not both, or the pipeline errors out. The Functions page repeats it
for the whole script trio: "You cannot use `before_script`, `after_script`, or `script` in a job when
you run functions."

Until now the vocabulary had no `run`. A Functions job could only be written through `raw`, which
bypasses the typed layer, and the schema ledger carried `$.*.run` as one `unmodelled` row declaring
its whole 32-path subtree. Spec 0009 decision 8 requires an ADR for this promotion because it changes
the job body model rather than adding a leaf.

A step is `name` plus exactly one of `func` (a function reference) or `script` (an inline shell
command), with optional `inputs` and `env`. GitLab also documents `before_script` and `after_script`
as unavailable in a Functions job, and a step name is an identifier: alphanumeric or underscore,
never starting with a number.

## Decision

`Job.run?: readonly Step[]` is the typed step list, and it is exclusive with the script trio.

- `Step` is a union of `FunctionStep` (`name`, `func`, optional `inputs`, optional `env`) and
  `ScriptStep` (`name`, `script`, optional `env`). The union makes "both `func` and `script`" and
  "neither" unrepresentable in TypeScript.
- `inputs` is author data keyed by the function's own input names, so its values are `Value`; `env`
  is `Text` per name, because GitLab documents strings there. Both preserve insertion order.
- `run` is emitted between `script` and `after_script`, the position the fixed job order gives it.
  The two cannot both be present, so the slot is stable rather than visible as a pair.
- `validate` refuses a job that declares `run` together with `script` (or `before_script` or
  `after_script`). Each diagnostic has the `run` path and names both paths in its message, so the
  author can see which two fields collide. It also refuses an empty step list and a step name that
  is not GitLab's identifier.
- `run` joins the reserved job keys, so `raw` may not carry it. The field, never the escape hatch, is
  how a job carries a step list, and an absent one stays absent.
- `raw` remains for the step shapes the vocabulary does not model: the deprecated `step:` spelling of
  a function reference and the map forms (`func.git`, `func.oci`). Those stay declared gap rows rather
  than being guessed at from the schema.

## Consequences

- `Job` widens: source-compatible for every existing definition, since the field is optional.
- A job with neither `script` nor `run` remains legal (ADR 0014): a merge may supply either. A job
  with both is now a build-time error rather than a pipeline-creation error.
- The reported grammar moves: `$.*.run` (32 schema paths) leaves the `unmodelled` rows. Nine paths
  become modelled; the remaining 23 are declared as three children rows (`step`, `func.git`,
  `func.oci`), so the completion target's modelled-plus-unmodelled sum is unchanged.
- The docs-derived `gitlab-run` corpus entry pins the three shapes the vocabulary emits. It is shape
  evidence, not proof that a real pipeline uses Functions, and `PROVENANCE.md` says so.
- `before_script` and `after_script` are diagnosed only when they collide with `run`; their own
  shapes and lowering are unchanged.

## Alternatives

- **Model `run` as another job keyword beside `script` and let GitLab reject the pair.** Rejected: the
  library's one place for whole-document checks is `validate`, and a diagnostic here names both
  paths instead of leaving the author to a pipeline-creation error.
- **A single `Step` interface with optional `func` and `script`.** Rejected: it admits both and
  neither, and the emitter would need a runtime branch that the type already decides.
- **Model the map forms of `func` immediately.** Rejected: GitLab deprecates the Git reference and
  the one-string OCI reference covers the documented examples; the expanded forms stay declared debt.
- **Put `run` in `raw` and call the keyword supported.** Rejected: `raw` is author data, not
  vocabulary; nothing would be typed, validated or counted, and the ledger row would remain.
