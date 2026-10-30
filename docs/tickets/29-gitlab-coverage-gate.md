# 29: Coverage gate and hidden templates

**Spec:** `docs/specs/0005-gitlab-ci-breadth.md`

**What to build:** The measurement GitLab lacks: a modelled-path inventory, an exhaustiveness gate over
the corpus, and `templates` for hidden jobs and anchor-only entries. Until hidden templates leave
`raw`, the gate cannot distinguish author data from vocabulary, so `templates` lands here, with the
gate.

Mirror `test/corpus/github-actions/inventory.ts`, `exhaustiveness.ts` and `exhaustiveness.test.ts`,
reusing the shared corpus helpers.

**Blocked by:** none.

**Status:** ready-for-agent

- [ ] `Pipeline` accepts `templates?: Readonly<Record<string, Value>>`; entries emit at the document
      root between `stages` and the job entries, in record order, with values lowered as plain data.
- [ ] A `templates` key that does not start with `.` is refused with a diagnostic at
      `$.templates["<key>"]`; a hidden key written through pipeline `raw` collides like any other
      already-emitted key.
- [ ] The `terraform-images` fixture moves `.terraform-versions` from `raw` to `templates`; its ledger
      row is deleted and the corpus still passes by data equality.
- [ ] A GitLab inventory exists under `test/corpus/gitlab-ci/`, renders definitions that use every
      modelled key (`stages`, `stage`, `script`) and never `raw`, and its rendered key-path union is
      the modelled set.
- [ ] The gate fails when a corpus key is neither modelled nor declared, when a declared row is unused,
      and when a modelled key is written through `raw`.
- [ ] Top-level keys starting with `.` are treated as author data and excluded on both sides of the
      gate, so hidden templates never need a ledger row.
- [ ] The ledger is 18 rows after this ticket, all vocabulary gaps; the coverage test still asserts set
      equality in both directions.
- [ ] Goldens show `templates` before jobs and nowhere else; existing goldens change only where
      `.terraform-versions` moved.
- [ ] `pnpm check` passes.
