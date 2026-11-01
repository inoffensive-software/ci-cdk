# 101: Root pages as a job name

**Spec:** `docs/specs/0010-gitlab-ci-pages.md`

**What to build:** The pinned schema declares the root `pages` property as `$ref: job`, so it is a job
whose name is its key, not a pipeline keyword. No field is added: the document root already separates a
pipeline keyword from a job name, and the gate must treat `pages` as the latter.

**Blocked by:** 100 (Re-triage and target).

**Status:** done

- [x] `pages` is not a `Pipeline` field and is not a `GLOBAL_KEYWORDS` entry, so a job named `pages` is
      legal and emits at the document root in `jobs` order.
- [x] The schema gate normalises the root `$.pages` subtree onto the job-name wildcard (`$.*`) and
      dedupes, so the documented grammar states one position per job-body key.
- [x] The inventory includes a job named `pages` without raw, proving the name is a name.
- [x] `schema-gap-debt.json` drops `$.pages`; `$.*.pages` (the job keyword) stays for ticket 102.
- [x] A focused test proves `$.pages` is absent from `SCHEMA_PATHS` and `$.pages.x` maps to `$.*.x`.
- [x] `pnpm check` passes.
