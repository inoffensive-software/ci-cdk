# 33: Coverage gate and hidden templates

**Spec:** `docs/specs/0006-gitlab-ci-breadth.md`

**What to build:** The measurement GitLab lacks: a modelled-path inventory, an exhaustiveness gate over
the corpus, and `templates` for hidden jobs and anchor-only entries. Until hidden templates leave
`raw`, the gate cannot distinguish author data from vocabulary, so `templates` lands here, with the
gate.

Mirror `test/corpus/github-actions/inventory.ts`, `exhaustiveness.ts` and `exhaustiveness.test.ts`,
reusing the shared corpus helpers.

**Blocked by:** none.

**Status:** done

- [x] `Pipeline` accepts `templates?: Readonly<Record<string, Value>>`; entries emit at the document
      root between `stages` and the job entries, in record order, with values lowered as plain data.
- [x] A `templates` key that does not start with `.` is refused with a diagnostic at
      `$.templates["<key>"]`; a hidden key written through pipeline `raw` collides like any other
      already-emitted key.
- [x] The `terraform-images` fixture moves `.terraform-versions` from `raw` to `templates`; its ledger
      row is deleted and the corpus still passes by data equality.
- [x] A GitLab inventory exists under `test/corpus/gitlab-ci/`, renders definitions that use every
      modelled key (`stages`, `stage`, `script`) and never `raw`, and its rendered key-path union is
      the modelled set.
- [x] The gate fails when a corpus key is neither modelled nor declared, when a declared row is unused,
      and when a modelled key is written through `raw`.
- [x] Top-level keys starting with `.` are treated as author data and excluded on both sides of the
      gate, so hidden templates never need a ledger row.
- [x] The ledger is 18 rows after this ticket, all vocabulary gaps; the coverage test still asserts set
      equality in both directions.
- [x] Goldens show `templates` before jobs and nowhere else; existing goldens change only where
      `.terraform-versions` moved.
- [x] `pnpm check` passes.
