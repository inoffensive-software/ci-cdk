# 27: GitLab provider documentation

**Spec:** `docs/specs/0004-gitlab-ci-provider.md`

**What to build:** Point the living documents at the provider that now exists, without restating the
format contract or the architecture. Three edits, each narrow: the README's provider table, the
architecture's provider surface, and the sentence that currently reads as a provider-neutral
literal-block rule.

**Blocked by:** 25 (GitLab corpus, first entry).

**Status:** done

- [x] The README provider table shows `@inoffensive/ci-cdk/gitlab-ci` as `In Progress`, and its
      subpath matches the package export exactly.
- [x] The architecture's provider surface names the GitLab module and its modules (`types`,
      `to-doc`, `validate`, `render`, `index`), and states that `render` and `toDoc` are the public
      surface, linking ADR 0008 rather than repeating its reasoning.
- [x] The architecture's "Shell text (`run`, `script`) is a literal block scalar" line now names
      GitHub Actions' `run` field and its opt-in `script` leaf as the scope of that rule; it no
      longer reads as applying to every provider's `script` field.
- [x] No invariant, format rule or decision is copied into the README or the architecture beyond the
      status and surface facts above.
- [x] `pnpm check` passes, including the formatter over the edited files.
