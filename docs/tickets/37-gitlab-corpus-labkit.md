# 37: Corpus, labkit

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** A second GitLab corpus entry that reaches shapes the container-build entry cannot:
defaults, includes, workflow rules, cache keys, matrix aliases and `when: never`.

Fetch `gitlab-org/labkit` at commit `8024160e53afaa18991004aa3e06dd336665f983`, path
`.gitlab-ci.yml` (518 lines, MIT, Copyright (c) 2011-2026 GitLab, Inc.). Verify SHA-256
`ec24d2817707bdbaf093ea56b12a0ec9224f9a894cf95845f5c80501bc9e89ea`. Do not edit the file.

**Blocked by:** 33 (Coverage gate and hidden templates).

**Status:** done

The file is a fragment: thirteen jobs declare no `script` because they override a job an include
defines. ADR 0014 makes `Job.script` optional and stops checking an omitted `stage`; it is folded into
this ticket because no data-preserving fixture is possible without it.

- [x] The file is vendored verbatim with repo, commit, path, MIT licence, SHA-256 and comparison mode
      `data` in provenance.
- [x] A per-entry fixture reproduces the file's parsed data through `render(fixture, { header: "" })`;
      hidden `.`-prefixed entries use `templates`, not `raw`; anchors and aliases are written as their
      resolved data.
- [x] Unmodelled keywords are written through pipeline or job `raw` and every such path has a ledger
      row with a vocabulary-gap reason; no row is a byte-fidelity device.
- [x] The coverage test and the exhaustiveness gate both accept the new entry; no modelled key is
      written through `raw`.
- [x] No byte-equality assertion is added.
- [x] `pnpm check` passes.
