# Spec 0008: Bitbucket Pipelines, grammar completion

Status: ready-for-agent
Covers: the six grammar families the documented-grammar report leaves open and that have evidence:
expanded artifacts, custom-pipeline variables, event triggers, runtimes and registry auth, child
pipelines, and the agent runtime. Step auth and `labels` have no evidence; they are modelled from the
pinned schema and marked unproven, as are the remaining schema-only keys.
Respects: ADR 0001, ADR 0002, ADR 0003, ADR 0005, ADR 0008, ADR 0010, ADR 0011, ADR 0013; specs 0005, 0007.
Adds: ADR 0018 (a script item may carry an agent task, and definitions may carry agents).

## Problem Statement

Spec 0007 shipped a measured provider: 1,282 modelled paths, 566 declared gaps, six overclaims. Of
the 2,516 paths declared out of scope, seven families are real Bitbucket features a consumer may
need. Six of them have usable evidence today. Leaving them out means a consumer falls back to `raw`,
which validates nothing, or writes the file by hand.

The evidence is uneven, and that shapes the slice. Expanded artifacts, custom-pipeline variables and
event triggers have licence-clean real configs. The runtime family lost its two configs to schema
disagreement and keeps one, for the `arch` arm. Child pipelines have a clean documented snippet but
no redistributable config. The agent runtime has neither a real config nor an Atlassian page that
documents its keys; only the pinned schema describes it. Step auth and `labels` have no real config
and no documentation either, so they are modelled from the schema and marked unproven rather than
left untyped.

## Solution

Model the six families, each as a vertical slice with its own evidence:

- Expanded artifacts: the map form with `paths`, `download` and named `upload` entries.
- Custom-pipeline variables: the leading `variables:` item with name, default, allowed values and
  description.
- Event triggers: the top-level `triggers:` map, keyed by trigger type, each entry a condition and a
  list of pipeline names.
- Runtimes and registry auth: `runtime` on options and steps (cloud and self-hosted), and the
  OIDC-role form of `image.aws`.
- Child pipelines: `type: pipeline`, `custom`, `input-variables`, and the step rules that follow from
  them.
- Agent runtime: `definitions.agents` and the agent task form of a script item, inferred from the
  pinned schema. Marked unproven in the provider page because no config and no documentation
  evidence it.
- The remaining schema keys with no config or page: artifact upload `type`, `capture-on`, `depth` and
  `ignore-paths`; step `auth.system.scopes`; pipeline `labels`; static `image.aws` credentials; and
  self-hosted runtime storage. They are modelled from the pinned schema and marked unproven.

Every slice re-derives the gap and overclaim lists, so the report shrinks as the vocabulary grows.
The provider page is regenerated once at the end, not per slice.

## User Stories

1. As a library consumer, I want `artifacts` to accept a map with `paths` and `download`, so that a
   producing step publishes files and a consuming step downloads them.
2. As a library consumer, I want `artifacts.upload` to accept named entries with `paths`, so that
   several artifacts can be published from one step.
3. As a library consumer, I want `download` to accept a boolean or a list of names, so that a step
   can consume every artifact or only some.
4. As a library consumer, I want a custom pipeline to declare input variables with name, default,
   allowed values and description, so that a manual run prompts for the right inputs.
5. As a library consumer, I want the variable declarations emitted before the pipeline's items, so
   that the file reads the way Bitbucket documents it.
6. As a library consumer, I want `triggers` keyed by trigger type, so that a pipeline can start
   another pipeline when a pull request or deployment event happens.
7. As a library consumer, I want a trigger entry to carry a condition expression and a list of
   pipeline names, so that the event wiring is typed without being evaluated.
8. As a library consumer, I want `runtime` on options and on a step, so that cloud version, arch,
   platform and IP-range settings are typed.
9. As a library consumer, I want a self-hosted runtime with CPU, memory and volumes, so that runner
   sizing is expressible.
10. As a library consumer, I want the OIDC-role form of `image.aws`, so that an ECR image pulls with
    an assumed role rather than static keys.
11. As a library consumer, I want a step to declare `type: pipeline` with a `custom` target, so that
    a parent pipeline can invoke a child pipeline.
12. As a library consumer, I want `input-variables` on a child step, so that the parent passes values
    into the child.
13. As a library consumer, I want a child step with no `custom` target refused, so that the file is
    not emitted with an unusable child pipeline.
14. As a library consumer, I want options that Bitbucket rejects on a child step, such as `image` or
    `services`, refused, so that the type does not permit an invalid step.
15. As a library consumer, I want `definitions.agents` to accept an agent definition with a prompt
    and optional config, permissions, provider and setup script, so that the schema's agent
    vocabulary is expressible.
16. As a library consumer, I want a script or after-script item to be an agent task, so that an
    agent runs in the step's sequence alongside commands and pipes.
17. As a library consumer, I want an artifact upload to carry its type, capture-on rule, search
    depth and ignore paths, so that a named upload is not limited to a name and a path list.
18. As a library consumer, I want `step.auth.system.scopes`, so that the schema's per-step auth
    form is expressible.
19. As a library consumer, I want top-level `labels`, so that repository metadata on the pipeline is
    expressible.
20. As a maintainer, I want a schema-derived key marked unproven, so that inference is visible in
    the same place as corpus-backed support.
21. As a provider author, I want each new field to keep the schema's alphabetical position, so that a
    key's place in the file stays derivable.
22. As a provider author, I want every new field to leave an absent value unemitted, so that adding
    the vocabulary does not add empty keys.
23. As a maintainer, I want one pinned corpus entry per evidenced family, so that the support claim
    is measurable rather than documented.
24. As a maintainer, I want the child-pipeline and agent slices to state their evidence level, so
    that a docs-derived or schema-derived shape is not presented as proven.
25. As a maintainer, I want the gap list re-derived after each slice, so that a modelled keyword
    disappears from the roadmap in the same change that models it.
26. As a maintainer, I want the stale-row check to fail if a modelled keyword keeps its gap row, so
    that the report cannot overstate the debt.
27. As a maintainer, I want the inventory extended with each new key, so that the exhaustiveness gate
    and the coverage table keep meaning what they say.
28. As a maintainer, I want the provider page to mark unproven families explicitly, so that a reader
    can tell corpus-backed support from schema-backed inference.
29. As a maintainer, I want the final page regeneration to update Non-goals, coverage and the
    documented-grammar block together, so that the claim and its debt stay one artefact.

## Implementation Decisions

### Common rules

- Evidence decides a fixture's provenance, not whether a key is modelled. Every key the pinned
  schema describes is modelled, from a corpus config, a documentation snippet or the schema itself.
  Only cross-file resolution is excluded. A key with no corpus and no documentation is schema-derived
  and is marked unproven on the provider page.
- Each slice adds its types, lowering, validation where a document-level rule exists, tests, goldens
  and at least one corpus entry or an explicitly marked synthetic fixture.
- Emission order stays the schema's alphabetical order at each level, with `raw` last.
- After a slice, re-run the documented-grammar diff and rewrite `schema-gap-debt.json` and
  `schema-gap-overclaims.json`; a modelled keyword's rows are deleted or narrowed. The stale-row
  check proves none survive.
- No new leaf constructors. The agent task is a struct inside a script sequence, like a pipe.
- ADR 0018 records the two surface widenings: a script item becomes `Text | Pipe | AgentTask`, and
  `Definitions` gains `agents`.

### Expanded artifacts

```ts
export type Artifacts =
  | readonly string[]
  | {
      readonly paths?: readonly string[];
      readonly download?: boolean | readonly string[];
      readonly upload?: readonly ArtifactUpload[];
    };

export interface ArtifactUpload {
  readonly name: Text;
  readonly paths: readonly string[];
}
```

- Emission: `download`, `paths`, `upload`; upload entries emit `name` then `paths`.
- Validation: an upload entry needs a non-empty name and at least one path.
- Corpus: `snyk-schmidtty/goof-artifactory` at `6838e122fe6f749c7ff183e0fed0ab8dc415276c`
  (Apache-2.0, 1481 bytes, SHA-256 `043f661c...ca2da6`) evidences the map form with `paths` and
  `download`. The named `upload` shape is documentation-derived, from the child-pipeline page.
- `capture-on`, `depth`, `ignore-paths` and the `type` of an upload are schema-derived: the pinned
  schema types them, no config and no page documents them, and the provider page marks them unproven.

### Custom-pipeline variables

```ts
export interface CustomVariable {
  readonly name: string;
  readonly default?: Text;
  readonly description?: Text;
  readonly "allowed-values"?: readonly Text[];
}
```

- `NamedPipeline` gains `variables?: readonly CustomVariable[]`; lowering emits a leading
  `- variables:` item before the pipeline's items. Each variable emits `allowed-values`, `default`,
  `description`, `name`.
- Validation: a variable needs a non-empty name; `allowed-values` needs at least one value.
- Corpus: `Nakama-Partnering-Services/nakama-project-scaffolding` at
  `fd8bfc6f5b7c9e3ada89c99c8d8aec27d586a6f0` (MIT, 7188 bytes, SHA-256 `ca31bd33...`) exercises the
  leading item with quoted values and is the family's only vendored entry. `description` has no
  corpus use and is schema-derived. `dawiddiwad/salesforce-e2e-test-automation` at
  `df236454fd51129cbeb118c4339a8b6908e21740` was dropped rather than forcing a conformance
  exception: its `default` is a boolean, while the pinned schema types `default` as a string.

### Event triggers

```ts
export interface TriggerConfig {
  readonly condition: Text;
  readonly pipelines: readonly string[];
}

export type Triggers = Readonly<Record<string, readonly TriggerConfig[]>>;
```

- `PipelineConfig` gains `triggers?: Triggers`, emitted after `pipelines` and before `raw`.
- Trigger-type keys are author data: no closed union, because Bitbucket's documented list is wider
  than any config and grows.
- Validation: a trigger list needs at least one entry; an entry needs a non-empty condition and at
  least one pipeline name.
- Corpus: `alibaba/open-code-review` at `476f661f26e5576a36003abe7a37d5ff8546b2df` (Apache-2.0,
  10666 bytes, SHA-256 `a8661538...`) and `Vardot/ddev-dev-tools` at
  `515f6901367458f75ee4956f8172e8566d7879f7` (Apache-2.0, 8216 bytes, SHA-256 `f0ca7e77...`), both
  example files rather than live configs; `PROVENANCE.md` records that.

### Runtimes and registry auth

```ts
export interface CloudRuntime {
  readonly arch?: "x86" | "arm";
  readonly "atlassian-ip-ranges"?: boolean;
  readonly "instance-type"?: Text;
  readonly platform?: "linux" | "windows";
  readonly version?: Text | number;
}

export interface SelfHostedRuntime {
  readonly cpu?: number;
  readonly memory?: number;
  readonly volumes?: readonly Text[];
}

export interface Runtime {
  readonly cloud?: CloudRuntime;
  readonly "self-hosted"?: SelfHostedRuntime;
}
```

- `Options` and `Step` gain `runtime?: Runtime`; `Image` gains the map arm
  `{ name: Text; aws: { "oidc-role": Text } }` alongside the existing name and credential arms.
- Emission: a runtime emits `cloud` then `self-hosted`; a cloud runtime emits `arch`,
  `atlassian-ip-ranges`, `instance-type`, `platform`, `version`; self-hosted emits `cpu`, `memory`,
  `volumes`.
- Corpus: `ChaosGroup/cg2_2014_demo` at `9cb7d426ec3feb9b5ec51ca2aaf9173f203fa921` (MIT, 587
  bytes, SHA-256 `53f05b79...`) evidences the arch arm. `rapidcloud-framework/rapidcloud-core` at
  `1b2e17692a8309161d44ff274daf6d11361f0d4d` was dropped because its empty `definitions` parses as
  null, which the document does not accept; `mathieu-lemay/pipeline-runner` at
  `bd89e4e6e64cab3c230da0c4c2a5402f72f1be67` was dropped because its step runtime `version` is an
  integer while the pinned schema types it as a string. Both were dropped rather than forcing a
  conformance exception.
- Evidence after the drops: the arch arm is corpus-backed; `image.aws` in both arms, self-hosted
  `cpu`, `memory`, `volumes` and `storage`, and the string form of `version` are schema-derived and
  marked unproven. `atlassian-ip-ranges`, `instance-type` and `platform` likewise have no vendored
  use.

### Child pipelines

- `Step` gains `type?: "pipeline"`, `custom?: Text` and `"input-variables"?: Readonly<Record<string, Text>>`.
  The emission order already has slots for them alphabetically.
- Validation: a step with `type: "pipeline"` requires a non-empty `custom`; the properties the child
  page lists as invalid on a child step are refused together with `type: "pipeline"`: `deployment`,
  `image`, `clone`, `oidc`, `services`, `caches`, `runs-on`, `size`, `runtime`, `trigger`. An inline
  step still requires `script`; a child step does not.
- Evidence: documentation-derived only, from
  https://support.atlassian.com/bitbucket-cloud/docs/child-pipeline-step-options/ retrieved
  2026-10-29. The fixture is synthetic and marked docs-derived in `PROVENANCE.md`; no vendored file.

### Agent runtime

- `Definitions` gains `agents?: Readonly<Record<string, AgentDefinition>>`; `AgentDefinition` carries
  `prompt` and optional `config`, `permissions`, `provider`, `setup-script` and `use-legacy-mcp`,
  typed from the pinned schema's `agent_definition`.
- `ScriptItem` becomes `Text | Pipe | AgentTask`; `AgentTask` carries `agent` and the same optional
  keys as the schema's `agent_task`. Emission is the same one-map-in-a-sequence shape a pipe has.
- Evidence: none. No real config and no Atlassian page documents the keys; the shape is inferred from
  `test/schemas/bitbucket-pipelines.json`. The provider page marks the family unproven, and the
  fixture is synthetic, schema-derived, and validated against the pinned schema.
- ADR 0018 records the widening and states the evidence level.

### Documentation

- One final docs slice regenerates the provider page: coverage, open gaps and documented grammar,
  Non-goals (every modelled family removed; imports, shared definitions, `definitions.runners` and
  the schema refresh retained), and an evidence paragraph that separates corpus-backed support from
  documentation-derived and schema-derived shapes and names the latter two unproven.
- The README status stays In Progress; no status change per family.

## Testing Decisions

- **Seam.** `render(pipelineConfig(...))` from `@inoffensive/ci-cdk/bitbucket-pipelines` for every
  corpus and synthetic fixture, header suppressed.
- **Second seam.** `toDoc` only where bytes cannot say which shape was chosen: the leading
  variables item, the agent task inside a script sequence, and the runtime map.
- **A good test** asserts emitted bytes, parsed data, a thrown diagnostic, the gate's verdict, or the
  schema's verdict. It does not assert private node shapes.
- **Corpus.** Each family with a redistributable config adds a pinned vendored file and a
  parsed-data test; provenance is recorded in the existing form. Example files are labelled as
  examples in `PROVENANCE.md`. A candidate entry that disagrees with the pinned schema is dropped
  rather than excused from the conformance check, and the family's evidence level drops with it.
- **Synthetic fixtures.** Child pipelines and agents have no vendored file. Their tests build the
  definition through the public API and assert the rendered bytes and their parse, and
  `PROVENANCE.md` records the source as documentation or schema with a retrieval date.
- **Inventory.** Every new key joins `inventory-items.ts` and the exhaustiveness gate; the gate must
  still report no corpus path outside the modelled set.
- **Documented grammar.** Each slice re-derives both lists; the stale-row check must be empty, and
  the schema-noise and overclaim rows are reviewed but not forced to shrink.
- **Schema conformance.** Every new golden and synthetic fixture validates against the pinned schema;
  the agent fixture is the proof the inferred shape matches the schema.
- **Diagnostics.** One test per new validation rule: upload name and paths, variable name and allowed
  values, trigger condition and pipelines, child step requiring `custom` and refusing the forbidden
  properties.
- **Prior art.** The spec 0007 tests: corpus tests, `toDoc` structural tests, `exhaustiveness.test.ts`,
  `schema-gap.test.ts`, `document.test.ts`, and `format-lock.test.ts`.

## Out of Scope

- Imports, shared pipeline definitions and `export`: cross-file resolution is an architecture non-goal.
- `definitions.runners`, the webitel shape, which the pinned schema does not describe.
- Resolving child pipelines, triggers, agents or definitions at build time. They are emitted, never
  loaded or evaluated.
- Refreshing the vendored schema. A refresh is a separate, deliberate change.

## Further Notes

- The next free ticket number is 59; 54-58 belong to other work already on main.
- Pins were verified on 2026-10-29 by fetching each blob at its commit and hashing it. The full
  research record is in the session scratch directory; the table above is authoritative.
- Two trigger fixtures are repository example files, not live configs. They are still real authored
  configs, but `PROVENANCE.md` says so.
- The agent slice is the largest and the least certain. Its ticket may be split if the schema's
  `agent_config`, `agent_permissions` and `agent_provider` definitions turn out to be deeper than a
  single context window.
- Every ticket ends with `pnpm check`; format-affecting ones update goldens deliberately.
