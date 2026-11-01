---
"@inoffensive/ci-cdk": patch
---

The initial release: typed builders for GitHub Actions, GitLab CI and Bitbucket Pipelines that render
provider YAML through one shared `Doc` core, with a `raw` escape hatch on each builder for shapes the
grammar does not model yet.
