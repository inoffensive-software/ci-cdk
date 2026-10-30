import type { Gap, Overclaim } from "../../schemas/gap-debt.js";

export { GAP_CATEGORIES } from "../../schemas/gap-debt.js";

export type { Gap, GapCategory, Overclaim } from "../../schemas/gap-debt.js";

/**
 * The roadmap of documented grammar this provider cannot emit. Adding a row declares a path on
 * purpose; deleting one is how a gap closes. Sorted by path, so two runs produce the same report.
 */
export const GAPS: readonly Gap[] = [
  {
    path: "$.jobs.*.services.*.command",
    reason:
      "a Docker `CMD` override for one service container, passed as arguments after the image name, and combined with `entrypoint` when both are given",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.services.*.entrypoint",
    reason:
      "a Docker `ENTRYPOINT` override for one service container, a single executable given as a string",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.snapshot",
    reason:
      "asks the job to build a custom runner image from its steps, either as an image name string or as a mapping of `image-name` and an optional `version`",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.snapshot.version",
    reason:
      "the major version a generated image is built under, a string such as `1` or `1.2`, in the mapping form of `snapshot`",
    category: "unmodelled",
  },
  {
    path: '$.jobs.*.snapshot["image-name"]',
    reason:
      "the name a generated image is published under, the required key of the mapping form of `snapshot`",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].background",
    reason:
      "a boolean on a `run` or `uses` step that starts it asynchronously and lets the job continue; later `wait` and `cancel` steps reach it by its id",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].cancel",
    reason:
      "a step that terminates one named background step, taking that step's id and sending SIGTERM so it can clean up",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].parallel",
    reason:
      "a group of steps run at once, each as a background step and all waited for before the job continues; an array of steps",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].parallel[]",
    reason: "one step inside a parallel group, with the same shape as any other step",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].wait",
    reason:
      "a step that pauses the job until named background steps finish, taking one step id as a string or several as an array",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].wait[]",
    reason: "one background step id that a wait step blocks on",
    category: "unmodelled",
  },
  {
    path: '$.jobs.*.steps[]["wait-all"]',
    reason:
      "a step that pauses the job until every background step finishes; it takes a boolean (or null) and no arguments",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[].*.*",
    reason:
      "an object under a key of a matrix cell object; `definitions.configuration` recurses through `additionalProperties`, while GitHub documents cell object keys that hold scalars, one level deep",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[].*[]",
    reason:
      "an array of cells under a key of a matrix cell object; the array branch of `definitions.configuration`, while GitHub documents those keys with scalar values",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[][]",
    reason:
      "an array whose elements are arrays, one more turn of the recursive `definitions.configuration`; GitHub documents a matrix variable as an array of scalars or of objects",
    category: "schema-noise",
  },
  {
    path: '$.jobs.*["runs-on"].group',
    reason:
      "the runner group of the mapping form of `runs-on`; docs/providers/github-actions.md#non-goals rules that form out",
    category: "out-of-scope",
  },
  {
    path: '$.jobs.*["runs-on"].labels',
    reason:
      "the label list of the mapping form of `runs-on`; the `runs-on` non-goal in docs/providers/github-actions.md#non-goals covers it",
    category: "out-of-scope",
  },
  {
    path: '$.jobs.*["runs-on"].labels[]',
    reason:
      "one label of the mapping form of `runs-on`; the `runs-on` non-goal in docs/providers/github-actions.md#non-goals covers it",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.*",
    reason:
      "`definitions.eventObject` sets `additionalProperties: true`, so the schema accepts any key under any event; GitHub documents only the filters the trigger vocabulary already types",
    category: "schema-noise",
  },
  {
    path: "$.on.*.inputs.*.deprecationMessage",
    reason:
      "the schema borrows `deprecationMessage` from the action metadata syntax; the workflow-syntax reference for `on.workflow_dispatch.inputs` documents only description, required, type, default and options",
    category: "schema-noise",
  },
  {
    path: "$.on.*.outputs",
    reason:
      "workflow_call output declarations; docs/providers/github-actions.md#non-goals rules them out",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.outputs.*",
    reason:
      "one workflow_call output under the author's chosen name; the workflow_call outputs non-goal covers it",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.outputs.*.description",
    reason:
      "the description of one workflow_call output; the workflow_call outputs non-goal covers it",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.outputs.*.value",
    reason:
      "the expression one workflow_call output is mapped to; the workflow_call outputs non-goal covers it",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.secrets",
    reason:
      "workflow_call secret declarations; docs/providers/github-actions.md#non-goals rules them out",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.secrets.*",
    reason:
      "one workflow_call secret under the author's chosen name; the workflow_call secrets non-goal covers it",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.secrets.*.description",
    reason:
      "the description of one workflow_call secret; the workflow_call secrets non-goal covers it",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.secrets.*.required",
    reason:
      "whether a workflow_call secret must be supplied; the workflow_call secrets non-goal covers it",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.workflows",
    reason:
      "the `workflow_run` filter that lists which workflows may trigger the run; the per-event filters non-goal in docs/providers/github-actions.md#non-goals stops at the configured events",
    category: "out-of-scope",
  },
  {
    path: "$.on.*.workflows[]",
    reason:
      "one workflow name in the `workflow_run` filter; the per-event filters non-goal in docs/providers/github-actions.md#non-goals covers it",
    category: "out-of-scope",
  },
];

/** A modelled path the schema does not enumerate; ADR 0011 says when a row is due. */
export const OVERCLAIMS: readonly Overclaim[] = [];
