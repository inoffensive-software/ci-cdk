import { block, fromValue, map, seq, type Doc } from "../core/index.js";
import type { Job, Step, Workflow } from "./types.js";

/** Declared field order, not the order the author wrote the properties in. */
const stepDoc = (step: Step): Doc => map([{ key: "run", value: block(step.run) }]);

const jobDoc = (job: Job): Doc =>
  map([
    { key: "runs-on", value: fromValue(job["runs-on"]) },
    { key: "steps", value: seq(job.steps.map(stepDoc)) },
  ]);

/**
 * The single lowering pass. `jobs` is an array on the struct so composition is spread and concat;
 * it becomes a map keyed by id here, in array order, with `id` stripped from the body.
 */
export const toDoc = (workflow: Workflow): Doc =>
  map([
    { key: "name", value: fromValue(workflow.name) },
    { key: "on", value: fromValue(workflow.on) },
    {
      key: "jobs",
      value: map(workflow.jobs.map((job) => ({ key: job.id, value: jobDoc(job) }))),
    },
  ]);
