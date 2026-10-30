# 62: Runtimes and registry auth

**Spec:** `docs/specs/0008-bitbucket-grammar-completion.md`

**What to build:** `runtime` on options and steps, and the OIDC-role form of `image.aws`, so cloud and self-hosted runner settings and ECR pulls are typed.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `Runtime` carries `cloud` (arch, atlassian-ip-ranges, instance-type, platform, version) and `self-hosted` (cpu, memory, volumes); `Options` and `Step` accept it.
- [ ] `Image` gains the `{ name, aws: { "oidc-role" } }` arm without changing the existing string, name and credential arms.
- [ ] Emission is `cloud` then `self-hosted`; cloud keys alphabetical; self-hosted `cpu`, `memory`, `volumes`; an absent key is not emitted.
- [ ] `image.aws` accepts both the `oidc-role` form and the `access-key`/`secret-key` pair; the pair is schema-derived because no config uses it.
- [ ] `SelfHostedRuntime` gains `storage` with the schema's AWS and GCP arms, schema-derived.
- [ ] `rapidcloud-framework/rapidcloud-core` at `1b2e17692a8309161d44ff274daf6d11361f0d4d` (MIT, 4914 bytes, 111 lines, SHA-256 `c4467a0b0d15995c543f771123ac9e9f6c4812a8724b1de3b840d9d41dcc1e86`) is vendored and compares as parsed data; it proves `image.aws.oidc-role`.
- [ ] `mathieu-lemay/pipeline-runner` at `bd89e4e6e64cab3c230da0c4c2a5402f72f1be67` (MIT, 16397 bytes, 536 lines, SHA-256 `463b53a4e588a8e7bcded2a825a4b28362fa956f089c7ce5dfda30a6d136f5c6`) is vendored and compares as parsed data; it proves step-level cloud runtime with an integer version.
- [ ] `ChaosGroup/cg2_2014_demo` at `9cb7d426ec3feb9b5ec51ca2aaf9173f203fa921` (MIT, 587 bytes, 25 lines, SHA-256 `53f05b79273d74f8d8dff5da77099b98982c19c188625f1a3564afae9d923bde`) is vendored and compares as parsed data; it proves the arch arm.
- [ ] `definitions.runners` remains out of scope and declared: the pinned schema does not describe it.
- [ ] Inventory, exhaustiveness gate and documented-grammar lists are re-derived; the stale-row check is empty.
- [ ] Goldens are added; no existing golden changes.
- [ ] `pnpm check` passes.
