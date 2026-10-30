# 24: GitLab raw escape hatch

**Spec:** `docs/specs/0004-gitlab-ci-provider.md`

**What to build:** `raw` at pipeline and job level, so every GitLab keyword this slice does not model
can still be written. Raw entries are lowered as one map through the boundary parser, appended after
the modelled keys at their own level, and refused when they collide with a key already emitted there.

**Blocked by:** 23 (GitLab provider tracer).

**Status:** ready-for-agent

- [ ] `pipeline({ stages, jobs, raw })` appends the raw entries after `stages` and the job entries, in
      the record's insertion order; `job({ ..., raw })` appends after `stage` and `script`.
- [ ] Raw values keep their parsed type and nesting: maps, sequences, numbers, booleans, nulls and
      quoted strings all round-trip.
- [ ] A pipeline raw key equal to `stages` or to any job name is refused, with a diagnostic at
      `$.raw["<key>"]`.
- [ ] A job raw key equal to `name`, `stage` or `script` is refused, with a diagnostic at
      `$.jobs[i].raw["<key>"]`.
- [ ] A raw value that is not a plain record is refused with a diagnostic at `$.raw` or
      `$.jobs[i].raw`, not silently dropped.
- [ ] A raw entry whose value fails the boundary parser reports a rebased path pointing at the raw
      entry the author wrote, not at `$`.
- [ ] Pipeline raw can write a hidden template key such as `.template` and a global keyword such as
      `image`, and both appear at the document root.
- [ ] Refusals are collected with the other diagnostics and thrown once by `toDoc`.
- [ ] `pnpm check` passes.
