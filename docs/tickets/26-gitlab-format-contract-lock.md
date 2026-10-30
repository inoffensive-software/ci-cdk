# 26: GitLab format contract lock

**Spec:** `docs/specs/0004-gitlab-ci-provider.md`

**What to build:** The goldens that freeze this provider's emitted bytes for the whole modelled
vocabulary, including the cases a later field is most likely to disturb: empty collections, key
order, script as string versus array, quoting traps, and the header. Format-affecting work is done by
now, so these pin final bytes rather than an intermediate spelling.

**Blocked by:** 25 (GitLab corpus, first entry).

**Status:** ready-for-agent

- [ ] Goldens exist for: an empty pipeline, a stages-only pipeline, a single job with `stage` and a
      string `script`, a job with an array `script`, and a job with both modelled fields plus raw.
- [ ] A quoting golden covers script strings containing `: `, ` #`, `yes`, `no`, `1.10`, a leading
      `-`, and a newline; each parses back to the original string.
- [ ] A header golden pins the default header as the first line with no blank line after it, and a
      second golden pins `{ header: "" }` as no header at all.
- [ ] Every golden is LF-only, ends with exactly one newline, and contains no blank lines outside a
      block scalar.
- [ ] An empty sequence emits `[]` and an empty map emits `{}`; no other flow style appears.
- [ ] `stages` appears before the jobs and jobs appear in array order; a job's `stage` appears before
      `script`; raw entries appear last at their level.
- [ ] Two `render` calls on the same pipeline struct are byte-identical.
- [ ] Regenerating the goldens from unchanged source produces no diff.
- [ ] `pnpm check` passes.
