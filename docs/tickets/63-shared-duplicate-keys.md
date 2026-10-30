# 63: One duplicate-key diagnostic helper

**Spec:** none (refactor found by the sharing sweep)

**What to build:** Four places detect the same thing — two items claiming one key — and report every
position in the diagnostic path notation. The detection is shared; the noun and the message stay with
the provider.

**Blocked by:** 62 (Core value helpers the providers keep re-writing), because both touch core and the
provider validate modules.

**Status:** ready-for-agent

- [ ] Core exposes one helper that groups items by a caller-supplied key and returns each duplicated key
      with all of its positions.
- [ ] GitHub Actions `duplicateIds`, GitLab `duplicateStages` and `duplicateJobNames`, and Bitbucket's
      duplicate selector patterns and custom pipeline names use it; each keeps its own message text and
      its own path segments.
- [ ] Diagnostic paths and messages are byte-identical to today's, asserted by the existing tests with
      no edits beyond imports.
- [ ] `pnpm check` passes.
