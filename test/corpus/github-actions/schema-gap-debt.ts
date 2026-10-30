import type { Gap, Overclaim } from "../../schemas/gap-debt.js";

export { GAP_CATEGORIES } from "../../schemas/gap-debt.js";

export type { Gap, Overclaim } from "../../schemas/gap-debt.js";

/**
 * The roadmap of documented grammar this provider cannot emit. Adding a row declares a path on
 * purpose; deleting one is how a gap closes. Sorted by path, so two runs produce the same report.
 */
export const GAPS: readonly Gap[] = [
  {
    path: "$.jobs.*.services.*.command",
    reason:
      "a Docker `CMD` override for one service container; the service `command`/`entrypoint` non-goal in docs/providers/github-actions.md#non-goals covers it, after a search on 2026-10-29 found no permissively licensed public workflow using it",
    category: "out-of-scope",
  },
  {
    path: "$.jobs.*.services.*.entrypoint",
    reason:
      "a Docker `ENTRYPOINT` override for one service container; the service `command`/`entrypoint` non-goal in docs/providers/github-actions.md#non-goals covers it, after a search on 2026-10-29 found no permissively licensed public workflow using it",
    category: "out-of-scope",
  },
  {
    path: "$.jobs.*.snapshot",
    reason:
      "the `snapshot` job key in both its string and mapping forms; the `snapshot` non-goal in docs/providers/github-actions.md#non-goals covers it, after a search on 2026-10-29 found no permissively licensed public workflow using it",
    category: "out-of-scope",
  },
  {
    path: "$.jobs.*.snapshot.version",
    reason:
      "the version of the mapping form of `snapshot`; the `snapshot` non-goal in docs/providers/github-actions.md#non-goals covers it, after a search on 2026-10-29 found no permissively licensed public workflow using the key",
    category: "out-of-scope",
  },
  {
    path: '$.jobs.*.snapshot["image-name"]',
    reason:
      "the image name of the mapping form of `snapshot`; the `snapshot` non-goal in docs/providers/github-actions.md#non-goals covers it, after a search on 2026-10-29 found no permissively licensed public workflow using the key",
    category: "out-of-scope",
  },
  {
    path: "$.jobs.*.steps[].parallel[].parallel",
    reason:
      "a `parallel` group inside a parallel group; a group's items reuse `#/definitions/step`, so the schema nests, and the inventory models one level of group alone",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.steps[].parallel[].parallel[]",
    reason:
      "one step of a nested parallel group, with the same shape as any other step; the nested-group row covers it",
    category: "unmodelled",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[].*.*",
    reason:
      "an object under a key of a matrix cell object; `definitions.configuration` recurses through `additionalProperties`, while GitHub documents cell object keys that hold scalars, one level deep",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[].*.*.*",
    reason:
      "an object under a key of an object under a key of a matrix cell object, one more turn of the recursive `definitions.configuration` than GitHub documents",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[].*.*[]",
    reason:
      "an array under a key of an object under a key of a matrix cell object, the array branch of the recursive `definitions.configuration` one turn deeper than GitHub documents",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[].*[]",
    reason:
      "an array of cells under a key of a matrix cell object; the array branch of `definitions.configuration`, while GitHub documents those keys with scalar values",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[].*[].*",
    reason:
      "an object under a key of an array of matrix cell objects, another turn of the recursive `definitions.configuration`",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[].*[][]",
    reason:
      "an array of arrays under a key of a matrix cell object, another turn of the recursive `definitions.configuration`",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[][]",
    reason:
      "an array whose elements are arrays, one more turn of the recursive `definitions.configuration`; GitHub documents a matrix variable as an array of scalars or of objects",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[][].*",
    reason:
      "an object under an element of an array-valued matrix cell, another turn of the recursive `definitions.configuration`",
    category: "schema-noise",
  },
  {
    path: "$.jobs.*.strategy.matrix.*[][][]",
    reason:
      "an array whose elements are arrays of matrix cells, one more turn of the recursive `definitions.configuration` than the existing row declares",
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
