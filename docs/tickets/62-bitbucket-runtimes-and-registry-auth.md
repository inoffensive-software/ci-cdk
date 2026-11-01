# 62: Runtimes and registry auth

**Spec:** `docs/specs/0008-bitbucket-grammar-completion.md`

**What to build:** `runtime` on options and steps, and the OIDC-role form of `image.aws`, so cloud and self-hosted runner settings and ECR pulls are typed.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] `Runtime` carries `cloud` (arch, atlassian-ip-ranges, instance-type, platform, version) and `self-hosted` (cpu, memory, volumes); `Options` and `Step` accept it.
- [x] `Image` gains the `{ name, aws: { "oidc-role" } }` arm without changing the existing string, name and credential arms.
- [x] Emission is `cloud` then `self-hosted`; cloud keys alphabetical; self-hosted `cpu`, `memory`, `volumes`; an absent key is not emitted.
- [x] `image.aws` accepts both the `oidc-role` form and the `access-key`/`secret-key` pair; both arms
      are schema-derived, because the two configs that would have proved them were dropped.
- [x] `SelfHostedRuntime` gains `storage` with the schema's AWS and GCP arms, schema-derived.
- [x] `rapidcloud-framework/rapidcloud-core` at `1b2e17692a8309161d44ff274daf6d11361f0d4d` was
      dropped rather than forcing a conformance exception: its empty `definitions` parses as null,
      which the document does not accept. `image.aws` in both arms is therefore schema-derived.
- [x] `mathieu-lemay/pipeline-runner` at `bd89e4e6e64cab3c230da0c4c2a5402f72f1be67` was dropped
      rather than forcing a conformance exception: its step runtime `version` is an integer, while
      the pinned schema types `version` as a string. The string form is schema-derived.
- [x] `ChaosGroup/cg2_2014_demo` at `9cb7d426ec3feb9b5ec51ca2aaf9173f203fa921` (MIT, 587 bytes, 25 lines, SHA-256 `53f05b79273d74f8d8dff5da77099b98982c19c188625f1a3564afae9d923bde`) is vendored and compares as parsed data; it proves the arch arm.
- [x] `definitions.runners` remains out of scope and declared: the pinned schema does not describe it.
- [x] Inventory, exhaustiveness gate and documented-grammar lists are re-derived; the stale-row check is empty.
- [x] Goldens are added; no existing golden changes.
- [x] `pnpm check` passes.
