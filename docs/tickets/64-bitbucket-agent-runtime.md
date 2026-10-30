# 64: Agent runtime, inferred from the schema

**Spec:** `docs/specs/0008-bitbucket-grammar-completion.md`

**What to build:** `definitions.agents` and the agent task form of a script item, typed from the pinned schema. This is the only family with no config and no documentation evidence; the code says so, and the provider page will too.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] `AgentDefinition` carries `prompt` and optional `config`, `permissions`, `provider`, `setup-script` and `use-legacy-mcp`, mirroring the schema's `agent_definition`; `Definitions` gains `agents`, authored as a record of names.
- [ ] `ScriptItem` is `Text | Pipe | AgentTask`; `AgentTask` carries `agent` and the schema's optional task keys. A script sequence keeps its order and mixes all three forms.
- [ ] Emission is alphabetical at each level, `setup-script` and `script` sequences keep their own item shapes (string or pipe, no agent task), and absent keys are not emitted.
- [ ] Validation refuses an agent definition with an empty prompt or an empty name, and an agent task with an empty agent name, at the author's path.
- [ ] The shape is validated against the pinned schema: a synthetic definition using every agent key renders, parses, and conforms.
- [ ] ADR 0015 records the script-item widening and `definitions.agents`, and states that the shape is schema-derived with no corpus or documentation evidence.
- [ ] PROVENANCE records the synthetic fixture as schema-derived with the schema's copy date; there is no vendored config.
- [ ] Inventory, exhaustiveness gate and documented-grammar lists are re-derived; the stale-row check is empty; the agent paths leave GAPS and any schema disagreement joins OVERCLAIMS.
- [ ] Goldens are added; no existing golden changes.
- [ ] `pnpm check` passes.
