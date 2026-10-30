# 0001: One package, provider subpaths

**Status:** Accepted

## Context

The package ships three providers (GitHub Actions, GitLab CI, Bitbucket Pipelines) to one audience,
at one version, from one repository. It is a dev dependency that generates configuration; nothing
imports it at run time, so bundle size and tree-shaking are not consumer concerns.

Two facts about the architecture push in the same direction. The `Doc` model, the serializer and
`fromValue` are deliberately shared by every provider, so a bug fixed in the emitter is fixed
everywhere at once. And a change to emitted formatting is a breaking change for every consumer
regardless of which provider they use.

## Decision

One package. Providers are directories at `src/<provider>/`, each with its own subpath export
(`@inoffensive/ci-cdk/github-actions`). Providers import from core and never from each other.

## Consequences

Good:

- One build, one release, one changelog, one version. An emitter or formatter fix lands atomically
  for every provider instead of requiring three coordinated releases.

- Import ergonomics are identical to a multi-package layout, so splitting later is a mechanical
  change rather than an API change for consumers.

- No cross-package type-identity problems, which is the usual tax on separate packages sharing
  types.

- A breaking change in one provider is a major bump for the others' consumers. This is the honest
  cost of a single version, and it is the trade we are choosing: correctness and atomic fixes over
  independent release cadence.

- Consumers install every provider's code and types. Free, because this is a dev dependency.

- The provider boundary is enforced by convention and a lint/architecture rule rather than by the
  package graph. Weaker guarantee, no plumbing.

## Alternatives considered

**One package per provider.** Rejected: three sets of build, publish, provenance and versioning
plumbing, plus version skew between packages that share a `Doc` model and a formatter. It would
also make forked emitters tempting, which is the failure mode we most want to avoid.

**One package, no subpath exports (single entry).** Rejected: it loads every provider's vocabulary
for every consumer, and it makes provider boundaries invisible in the code, which is exactly the
pressure that produces a provider-neutral ORM.

**A plugin/registry architecture with runtime discovery.** Rejected: there is no CLI and no dynamic
loading requirement. Orchestration is the consumer's own script.
