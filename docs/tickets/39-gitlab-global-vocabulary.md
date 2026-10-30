# 39: Global vocabulary and Scalar

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** The pipeline-level configuration GitLab documents: `default`, `include`, `variables`
and `workflow`, plus the provider-local `Scalar` alias that author maps need. After this ticket no
corpus entry writes a pipeline-level keyword through `raw`.

**Blocked by:** 38 (Corpus, gitlab-pages).

**Status:** done

- [x] `export type Scalar = string | number | boolean | LeafNode`; `variables` accepts
      `Record<string, Scalar>` at pipeline and job level; GitLab has no `default:variables`, and a numeric-looking string stays a
      string (ADR 0010).
- [x] `default` accepts the modelled defaults (`image`, `services`, `tags`, `before_script`,
      `after_script`, `cache`, `artifacts`, `retry`, `timeout`, `interruptible`) and emits them in the
      spec's fixed order.
- [x] `include` accepts local, remote, template, project (`ref`, `file`) and component (`inputs`)
      entries, each with optional `rules` and `integrity`; entries are emitted as data and never
      resolved.
- [x] `workflow` accepts `name`, `auto_cancel` and `rules`; rule values are accepted as data now and
      become typed in ticket 35.
- [x] Pipeline emission order is `default`, `include`, `stages`, `variables`, `workflow`, `templates`,
      jobs, `raw`, pinned by a golden.
- [x] Raw collisions now include every modelled global key, so pipeline `raw` cannot repeat `default`,
      `include`, `stages`, `variables`, `workflow`, a job name or a template key.
- [x] The inventory exercises every modelled key without `raw`, and the ledger rows for the corpus's
      pipeline-level `workflow`, `variables`, `include` and `default` are deleted.
- [x] `pnpm check` passes.
