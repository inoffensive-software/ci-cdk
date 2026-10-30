# 56: Step concurrency

**Spec:** `docs/specs/0005-documented-grammar-coverage.md` (a corpus-driven closure of its largest remaining cluster)

**What to build:** A step can run in the background, be waited for, be cancelled, or be grouped into a
parallel set. All seven documented-gap rows close, proved by `curl/curl`'s checksrc workflow, which uses
`background: true` and a bare `wait-all:` in the same job.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] A step accepts `background` (boolean), `cancel` (a step id), `wait` (one id or several),
      `wait-all` (boolean or empty), and `parallel` (a list of steps), emitted in the order the GitHub
      syntax reference lists them.
- [x] A bare `wait-all:` in the upstream file is expressible and lowers to `null`, matching what the
      file parses to.
- [x] The `curl/curl` workflow is vendored verbatim at the pinned commit, with repo, commit, path,
      curl licence and a why-this-entry recorded in provenance, and reproduces as parsed data.
- [x] The entry is registered, and the inventory exercises all seven paths, so the modelled set covers
      `background`, `cancel`, `parallel`, `parallel[]`, `wait`, `wait[]` and `wait-all`.
- [x] The seven rows leave the documented-grammar debt, and both generated blocks in the provider
      document are regenerated to match.
- [x] A provider test proves a background step, a wait step and a parallel group emit as written.
- [x] `pnpm check` passes.
