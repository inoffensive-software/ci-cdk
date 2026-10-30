# 58: Changelog and release process

**Spec:** none (repository process)

**What to build:** The thing every release needs before the first release exists: a changelog that
records what the package does, a written release procedure with a versioning policy, a generated
publish workflow, and the package metadata npm needs. Nothing is released, tagged or published here.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `CHANGELOG.md` exists in Keep a Changelog form with an `## [Unreleased]` section that describes
      what the package actually ships today: core, the three providers and their status, the corpus and
      the two gates. No invented history, no version numbers that do not exist.
- [x] `docs/releases.md` states the versioning policy (semver, pre-1.0 rules, the emitted format as a
      breaking-change boundary, support claims tied to a release), the changelog duty for any PR that
      changes published behaviour, and the step-by-step release procedure including the tag, the
      verification and the rollback rule (deprecate, never unpublish).
- [x] The publish path is npm trusted publishing from a generated `.github/workflows/release.yml` on a
      `v*` tag, with `id-token: write` and `--provenance`, and the page says plainly that the first
      publish cannot use it because npm only offers a trusted publisher for a package that exists.
- [x] `tools/ci/release.mts` generates the workflow through the DSL, `tools/ci/check-workflow.sh`
      verifies every generated workflow, and `pnpm ci:workflow` regenerates them all.
- [x] `tools/release/notes.mts` prints the commits since the last tag for drafting a section, with no
      dependency and no network access.
- [x] `package.json` carries `repository`, `homepage` and `bugs`, keeps `publishConfig.provenance`, and
      does not change its version.
- [x] No tag, no publish, no version bump, and `pnpm check` passes.
