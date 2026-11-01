# 0018: a script item may carry an agent task, and definitions may carry agents

**Status:** Accepted

**Supersedes:** nothing. It extends the public surface ADR 0013 records without changing the
`render`/`toDoc` seam ADR 0003 settles.

## Context

The pinned schema at `test/schemas/bitbucket-pipelines.json` describes a third form of script item:
an `agent_task` map with an `agent` name and optional overrides. It also describes an `agents` map
under `definitions`, whose entries are `agent_definition` objects with a required `prompt` and
optional `config`, `permissions`, `provider`, `setup-script` and `use-legacy-mcp`.

Nothing else evidences the family. No permissively licensed config uses either shape, and no
Atlassian page documents the keys, so unlike every other Bitbucket family there is no corpus entry
to pin and no documentation snippet to quote. The schema is the only description, and it is the
whole description. ADR 0013's rule that a provider exports no leaves does not decide whether a map
inside a script sequence is a leaf or a second item form.

The alternative is to leave both shapes out. A consumer with a schema-valid file could then only
write the agent family through `raw`, which validates nothing: the required `agent` name, the
required `prompt` and the closed `provider` set would all be untyped.

## Decision

`ScriptItem` is `Text | Pipe | AgentTask`, and `Definitions` gains
`agents?: Readonly<Record<string, AgentDefinition>>`.

- `AgentTask` carries `agent` and the schema's optional `config`, `permissions`, `prompt`,
  `provider` and `use-legacy-mcp`. It is one map element inside a script sequence, the same shape a
  pipe is, so the sequence keeps the author's order and may mix commands, pipes and tasks.
- `AgentDefinition` carries the required `prompt` and the same optional keys plus `setup-script`.
  A setup script is a sequence of command strings and pipes only; the schema does not allow an agent
  task there.
- `AgentConfig`, `AgentPermissions`, `AgentPermissionMode`, `AgentPermissionsOnAsk`,
  `AgentPermissionsOnAskRules` and `AgentProvider` type the nested shapes. `provider` is the closed
  union `"rovodev" | "claude" | "codex"` because the schema enumerates it, unlike trigger keys,
  which the author names.
- Emission is alphabetical at every level: `agents` before `caches` in `definitions`, and the
  agent keys in the schema's property order. An absent key is not emitted.
- Validation refuses an agent definition with an empty author-chosen name or an empty `prompt`, and
  an agent task with an empty `agent` name, each at the author's path. It never requires an agent
  task to resolve the definition it names: definitions are emitted, never loaded, which is the same
  rule the provider applies to caches, services and steps.

The entire shape is schema-derived. It is not corpus-backed and not documentation-backed, and the
provider page's coverage block lists it as modelled while the documented-grammar block keeps no gap
row for it. The synthetic fixture in `test/corpus/bitbucket-pipelines/agent-runtime.fixture.ts`
proves the inference matches the schema; `PROVENANCE.md` records the schema copy date. That is the
strongest evidence available for this family, and it is weaker than every other family's.

## Consequences

- The public surface grows by seven types and no value: an agent task is a struct, not a builder,
  and the sequence accepts it without a new constructor.
- `script:` and `after-script:` become wider than `setup-script:`, so the type says which positions
  can hold an agent task instead of leaving it to validation.
- A script item's union now has three arms that a reader must distinguish by key (`pipe`, `agent`,
  or a string), which is the same discrimination the emitted YAML already requires.
- The documented-grammar debt drops by the whole agent subtree and every agent-task position, while
  the family's support claim remains visibly unproven on the provider page.
- No `GAPS` row survives for either shape, so a schema refresh that adds an agent key fails the gate
  until the new key is modelled or declared.

## Alternatives

- **Leave the family out and keep the gap rows.** Rejected: the schema describes it, the scope
  principle models every key the schema describes, and `raw` would be the only way to write a
  schema-valid agent pipeline.
- **Model only `definitions.agents` and not the task.** Rejected: a definition nothing can reference
  is dead vocabulary, and the schema's `script` union names `agent_task` explicitly.
- **Give the agent task its own builder.** Rejected: ADR 0013 forbids new leaves, and the task is a
  map inside a sequence, which a pipe already establishes as a shape the sequence accepts directly.
- **Type `provider` as `Text`.** Rejected: the schema closes the set to three values, so a wider
  type would admit a document the pinned schema rejects.
