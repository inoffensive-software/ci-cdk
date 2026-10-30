# Releases

This page states the versioning policy, how a change is described, and the steps that publish a
release. [`CHANGELOG.md`](../CHANGELOG.md) is generated; do not edit it.

## Versioning

The package follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html), with the pre-1.0
meaning made explicit:

- A `0.MINOR` bump may break. While the major version is zero, the minor version carries the
  breaking-change signal that a major version carries after 1.0.
- A `0.0.PATCH` bump may not break. It fixes behaviour or documentation and is safe to adopt.

### The emitted YAML is a public contract

A consumer commits the generated file and reviews its diff. A change to the emitted bytes is
therefore breaking, whatever the intent behind it. This covers quoting, key order, indentation,
blank lines, the header and the trailing newline, not only the names and types of the API.

A pull request that changes emitted output does three things: it updates the goldens, it carries a
`minor` changeset, and it lands under a version bump that is allowed to break.

### Support claims belong to a release

A provider's compatibility table is read at a tag, not at `main`. `main` may be ahead of the last
release, and a claim there describes work no consumer can install yet. When quoting support, name
the version or the tag.

## Describing a change

[Changesets](https://github.com/changesets/changesets) versions the package and writes the
changelog. Every pull request that changes published behaviour adds a file at
`.changeset/<slug>.md`, where `<slug>` is a short kebab-case name:

```md
---
"@inoffensive/ci-cdk": minor
---

The GitLab CI `job` builder accepts `needs` as a list of job ids.
```

The bump type is `patch`, `minor` or `major`, chosen under the rules above. The summary is one line
that a consumer can read without the pull request, in the present tense, describing what ships.

The duty applies to every author. Agents write the file directly, because `pnpm changeset` is an
interactive prompt; `pnpm changeset --empty` marks a change that needs no release. A reviewer may
ask for the file before merging.

A pull request with published behaviour and no changeset is incomplete, and `changeset status`
reports it. Nothing else edits `CHANGELOG.md`: `pnpm release:version` owns that file.

## Release procedure

Run every step from a clean working tree on `main`.

1. Confirm `main` is clean and `pnpm check` passes.
2. Run `pnpm release:version`. Changesets applies every pending changeset, bumps `package.json` and
   the lockfile, rewrites `CHANGELOG.md`, and deletes the applied files. It creates no commit and no
   tag.
3. Review the generated section in `CHANGELOG.md` and the version in `package.json`. Fix a summary
   by editing the changeset and re-running, not by editing the changelog.
4. Commit the manifest, the lockfile and the changelog as `release X.Y.Z`.
5. Tag that commit with an annotated tag: `git tag -a vX.Y.Z -m "vX.Y.Z"`. A lightweight tag carries
   no tagger or message and is not what this procedure asks for.
6. Push the commit and the tag: `git push origin main` and `git push origin vX.Y.Z`.
7. The release workflow runs on the tag. It repeats the full gate, verifies that the tag matches the
   package version, packs the tarball and refuses to publish when it is empty or missing `dist`, then
   publishes to npm.
8. Verify the result from outside the repository:
   - `npm view @inoffensive/ci-cdk@X.Y.Z version dist.tarball dist-tags` confirms the version, the
     `latest` tag and the provenance attestation.
   - `npm pack @inoffensive/ci-cdk@X.Y.Z` into a scratch directory, `npm install` that tarball, and
     import the package root plus every subpath the exports map promises: `github-actions`,
     `gitlab-ci` and `bitbucket-pipelines`. A published package that resolves but cannot be imported
     is a broken release even when `npm view` looks right.
9. If the release is wrong, deprecate it with `npm deprecate @inoffensive/ci-cdk@X.Y.Z "reason"` and
   publish a fixed version. Never run `npm unpublish`; a published version stays available, and
   removing it breaks every lockfile that already resolved it.

## Publishing path

`.github/workflows/release.yml` is generated from `tools/ci/release.mts` and committed; run
`pnpm ci:workflow` after editing either generator. It runs on a push of a `v*` tag, or on manual
dispatch. It requests `contents: read` and `id-token: write`, and publishes with
`npm publish --provenance --access public`.

Before publishing it packs the tarball with `npm pack --dry-run` and fails when the pack is empty or
lacks the `dist` entry points. A `dist`-only package published from a tree that never ran the build
otherwise ships nothing useful, and nobody notices until the import fails.

The job authenticates through npm trusted publishing. GitHub mints an OIDC token for the run, npm
exchanges it for a short-lived credential, and the public attestation records the workflow and the
commit. No long-lived npm token is stored in the repository, in secrets, or in the environment.

npm binds the trusted publisher to the repository and the workflow filename, so renaming or moving
`.github/workflows/release.yml` breaks publishing until the package settings on npm are updated. The
filename is part of the release surface.

**The first publish is the exception.** npm only offers a trusted publisher for a package that
already exists, so the initial `0.1.0` cannot use the tag workflow. Publish it by hand as the
`@inoffensive` owner:

```
pnpm publish --access public
```

Then open the package settings on npm, add the trusted publisher for
`eddie-atkinson/ci-cdk` and `.github/workflows/release.yml`, and use the workflow for every release
after that one. The manual publish is a bootstrap step, not a fallback.

## Dist-tags

`latest` is the only dist-tag a normal release writes. If a pre-release is ever needed, it goes to
`next` and is published with `npm publish --tag next`. A pre-release never moves `latest`.

## The header rule

The emitted file header contains no package version and no timestamp. It is the fixed line
`# Generated by @inoffensive/ci-cdk. Do not edit.` A release therefore never changes generated
output, and regenerating a committed file after a version bump produces no diff.
