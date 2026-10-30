/**
 * The only categories a gap may carry. `unmodelled` is debt the provider should pay; `out-of-scope`
 * is a shape the provider document already names as a non-goal; `schema-noise` is grammar the schema
 * permits that GitHub does not document.
 */
export const GAP_CATEGORIES = ["unmodelled", "out-of-scope", "schema-noise"] as const;

export type GapCategory = (typeof GAP_CATEGORIES)[number];

/** A schema path the vocabulary cannot emit, with the debt it represents. */
export interface Gap {
  readonly path: string;
  readonly reason: string;
  readonly category: GapCategory;
}

/** A modelled path the schema does not enumerate, with the disagreement named. */
export interface Overclaim {
  readonly path: string;
  readonly reason: string;
}

/**
 * The roadmap of documented grammar this provider cannot emit. Adding a row declares a path on
 * purpose; deleting one is how a gap closes. Sorted by path, so two runs produce the same report.
 */
export const GAPS: readonly Gap[] = [
  {
    path: "$.concurrency.queue",
    reason:
      "a queue policy for pending runs in a concurrency group; the vocabulary emits only group and cancel-in-progress",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.concurrency.queue",
    reason:
      "a queue policy for pending runs at job level; the vocabulary emits only group and cancel-in-progress",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.environment.deployment",
    reason:
      "whether an environment reference creates a deployment record; the vocabulary emits only name and url",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.services.*.command",
    reason: "a Docker command override for a service container",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.services.*.entrypoint",
    reason: "a Docker entrypoint override for a service container",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.snapshot",
    reason: "a custom runner image generated from the job's steps; the string form of snapshot",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.snapshot.version",
    reason: "the major version of a generated image, in the mapping form of snapshot",
    category: "unmodelled",
  },
  {
    path: '$.jobs.*.snapshot["image-name"]',
    reason: "the image name a generated image is given, in the mapping form of snapshot",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].background",
    reason: "a step that keeps running in the background while later steps run",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].cancel",
    reason: "a step that cancels a background step",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].parallel",
    reason: "a step that groups steps to run in parallel",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].parallel[]",
    reason: "one step of a parallel group",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].wait",
    reason: "a step that waits for named background steps",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].wait[]",
    reason: "one background step name a wait step waits for",
    category: "unmodelled",
  },
  {
    path: '$.jobs.*.steps[]["wait-all"]',
    reason: "a step that waits for every background step",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[].*.*",
    reason:
      "the schema's recursive configuration lets a matrix cell be an object with further object keys; GitHub documents scalar cells only",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[].*[]",
    reason:
      "the schema's recursive configuration lets a matrix cell be an array of cells; GitHub documents scalar cells only",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[][]",
    reason:
      "the schema lets a matrix cell array contain arrays; GitHub documents scalar cells only",
    category: "schema-noise",
  },
  {
    path: '$.jobs.*["cache-mode"]',
    reason: "a cache access policy for one job (read, write, write-only or none)",
    category: "unmodelled",
  },
  {
    path: '$.jobs.*["runs-on"].group',
    reason:
      "a runner group name in the runs-on mapping form, which the provider document lists as a non-goal",
    category: "out-of-scope",
  },
  {
    path: '$.jobs.*["runs-on"].labels',
    reason:
      "the runner labels of the runs-on mapping form, which the provider document lists as a non-goal",
    category: "out-of-scope",
  },
  {
    path: '$.jobs.*["runs-on"].labels[]',
    reason:
      "one label of the runs-on mapping form, which the provider document lists as a non-goal",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.*",
    reason:
      "eventObject is an open map, so the schema permits any key under any event; GitHub documents only the filters the vocabulary types",
    category: "schema-noise",
  },
  {
    path: "$.on.*.outputs",
    reason: "workflow_call outputs, which the provider document lists as a non-goal",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.outputs.*",
    reason: "one workflow_call output declaration, which the provider document lists as a non-goal",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.outputs.*.description",
    reason:
      "the description of a workflow_call output, which the provider document lists as a non-goal",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.outputs.*.value",
    reason: "the value of a workflow_call output, which the provider document lists as a non-goal",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.secrets",
    reason: "workflow_call secrets, which the provider document lists as a non-goal",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.secrets.*",
    reason: "one workflow_call secret declaration, which the provider document lists as a non-goal",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.secrets.*.description",
    reason:
      "the description of a workflow_call secret, which the provider document lists as a non-goal",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.secrets.*.required",
    reason:
      "whether a workflow_call secret is required, which the provider document lists as a non-goal",
    category: "out-of-scope",
  },
  {
    path: "$.on.*[].timezone",
    reason: "an IANA timezone for a schedule entry; the vocabulary emits only cron",
    category: "unmodelled",
  },
  {
    path: '$["cache-mode"]',
    reason: "a workflow-wide cache access policy (read, write, write-only or none)",
    category: "unmodelled",
  },
];

/**
 * Modelled paths the schema does not enumerate. These are the comparison's residual: each names a
 * place where the walk cannot see a key the vocabulary writes, so the schema is stale or imprecise
 * rather than the emitter being wrong.
 */
export const OVERCLAIMS: readonly Overclaim[] = [
  {
    path: "$.on.*.inputs.*.options",
    reason:
      "workflowDispatchInput declares options, but workflow_dispatch carries a sibling oneOf beside its $ref, which draft-07 ignores, so the walk cannot reach it; the open eventObject still permits the key",
  },
  {
    path: "$.on.*.inputs.*.options[]",
    reason:
      "the element path of a choice input's options; the sibling oneOf under workflow_dispatch is unreachable, so the walk sees no element path",
  },
  {
    path: "$.on.*.types[]",
    reason:
      "the schema declares types as a bare array with no items, so the walk sees the array but not its element; GitHub documents string activity types",
  },
];
