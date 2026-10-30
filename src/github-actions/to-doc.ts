import { block, fromValue, map, seq, type Doc, type DocEntry, type Text } from "../core/index.js";
import type { Job, Step, Workflow } from "./types.js";

/** Only a declared field with a value is emitted; absent fields are not lowered at all. */
const entry = (key: string, value: Doc | undefined): readonly DocEntry[] =>
  value === undefined ? [] : [{ key, value }];

const present = (
  value: Text | number | boolean | Readonly<Record<string, Text>> | undefined,
): Doc | undefined => (value === undefined ? undefined : fromValue(value));

/** A plain string is shell text; a leaf carries its own style. */
const run = (value: Text | undefined): Doc | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === "string" ? block(value) : fromValue(value);
};

const stepDoc = (step: Step): Doc =>
  map([
    ...entry("id", present(step.id)),
    ...entry("if", present(step.if)),
    ...entry("name", present(step.name)),
    ...entry("uses", present(step.uses)),
    ...entry("run", run(step.run)),
    ...entry("working-directory", present(step["working-directory"])),
    ...entry("shell", present(step.shell)),
    ...entry("with", present(step.with)),
    ...entry("env", present(step.env)),
    ...entry("continue-on-error", present(step["continue-on-error"])),
    ...entry("timeout-minutes", present(step["timeout-minutes"])),
  ]);

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
