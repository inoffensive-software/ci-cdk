import {
  DOC,
  entry,
  fromValue,
  map,
  present,
  seq,
  type Doc,
  type LeafNode,
  type Text,
} from "../core/index.js";
import { type Forward, type Trigger, type TriggerIncludeEntry } from "./trigger-types.js";
import { type AllowFailure, type Environment, type Parallel, type Release } from "./types.js";

/** A leaf decides its own style; every other object here is one of the provider's own shapes. */
const isLeaf = (value: Environment | Trigger): value is LeafNode =>
  typeof value === "object" && Object.hasOwn(value, DOC);

/** The same test for a union that is not part of `Trigger`, such as a child-include entry. */
const isDocLeaf = (value: LeafNode | TriggerIncludeEntry): value is LeafNode =>
  Object.hasOwn(value, DOC);

/** A readonly array is not narrowed by `Array.isArray`, which only accepts a mutable one. */
const isIncludeList = (
  value: Text | TriggerIncludeEntry | readonly TriggerIncludeEntry[],
): value is readonly TriggerIncludeEntry[] => Array.isArray(value);

const environmentOptionsDoc = (environment: Exclude<Environment, string | LeafNode>): Doc =>
  map([
    { key: "name", value: fromValue(environment.name) },
    ...entry("url", present(environment.url)),
    ...entry("action", present(environment.action)),
    ...entry("on_stop", present(environment.on_stop)),
    ...entry("auto_stop_in", present(environment.auto_stop_in)),
    ...entry("deployment_tier", present(environment.deployment_tier)),
  ]);

/** A bare name stays a scalar; the map form keeps `name` first, then the lifecycle keys. */
export const environmentDoc = (environment: Environment): Doc =>
  typeof environment === "string" || isLeaf(environment)
    ? fromValue(environment)
    : environmentOptionsDoc(environment);

/** Release metadata, in GitLab's documented key order. */
export const releaseDoc = (release: Release): Doc =>
  map([
    { key: "tag_name", value: fromValue(release.tag_name) },
    { key: "description", value: fromValue(release.description) },
    ...entry("name", present(release.name)),
    ...entry("ref", present(release.ref)),
    ...entry("milestones", present(release.milestones)),
    ...entry("released_at", present(release.released_at)),
  ]);

/** `trigger:forward`, in the schema's key order; an absent key keeps GitLab's default. */
const forwardDoc = (forward: Forward): Doc =>
  map([
    ...entry("yaml_variables", present(forward.yaml_variables)),
    ...entry("pipeline_variables", present(forward.pipeline_variables)),
  ]);

/**
 * One child-pipeline include entry: the source discriminator first, then `job` for an artifact
 * entry, `ref`/`file` for a project entry, and the inputs last. No entry carries `rules` or
 * `integrity`; the schema allows them only on a pipeline-level include.
 */
const triggerIncludeEntryDoc = (item: TriggerIncludeEntry): Doc => {
  const inputs = entry("inputs", item.inputs === undefined ? undefined : fromValue(item.inputs));

  if ("local" in item) {
    return map([{ key: "local", value: fromValue(item.local) }, ...inputs]);
  }

  if ("template" in item) {
    return map([{ key: "template", value: fromValue(item.template) }, ...inputs]);
  }

  if ("artifact" in item) {
    return map([
      { key: "artifact", value: fromValue(item.artifact) },
      { key: "job", value: fromValue(item.job) },
      ...inputs,
    ]);
  }

  if ("project" in item) {
    return map([
      { key: "project", value: fromValue(item.project) },
      ...entry("ref", present(item.ref)),
      { key: "file", value: fromValue(item.file) },
      ...inputs,
    ]);
  }

  if ("component" in item) {
    return map([{ key: "component", value: fromValue(item.component) }, ...inputs]);
  }

  return map([{ key: "remote", value: fromValue(item.remote) }, ...inputs]);
};

/** A single path stays a scalar, one entry stays a map, several stay a sequence. */
const triggerIncludeDoc = (
  include: Text | TriggerIncludeEntry | readonly TriggerIncludeEntry[],
): Doc => {
  if (typeof include === "string") {
    return fromValue(include);
  }

  if (isIncludeList(include)) {
    return seq(include.map((item) => triggerIncludeEntryDoc(item)));
  }

  return isDocLeaf(include) ? fromValue(include) : triggerIncludeEntryDoc(include);
};

/**
 * A trigger in GitLab's documented key order. A bare string is a child pipeline path; the map form is
 * either a multi-project trigger (`project` is the discriminator) or a child trigger (`include`). The
 * project, the branch and the include are emitted as written, never resolved.
 */
export const triggerDoc = (trigger: Trigger): Doc => {
  if (typeof trigger === "string" || isLeaf(trigger)) {
    return fromValue(trigger);
  }

  if ("project" in trigger) {
    return map([
      { key: "project", value: fromValue(trigger.project) },
      ...entry("branch", present(trigger.branch)),
      ...entry("strategy", present(trigger.strategy)),
      ...entry("inputs", trigger.inputs === undefined ? undefined : fromValue(trigger.inputs)),
      ...entry("forward", trigger.forward === undefined ? undefined : forwardDoc(trigger.forward)),
    ]);
  }

  return map([
    { key: "include", value: triggerIncludeDoc(trigger.include) },
    ...entry("strategy", present(trigger.strategy)),
    ...entry("forward", trigger.forward === undefined ? undefined : forwardDoc(trigger.forward)),
  ]);
};

/**
 * A count stays a scalar; the matrix form lowers its rows whole, so each row keeps the author's key
 * order and a numeric-looking string stays a string (ADR 0010).
 */
export const parallelDoc = (parallel: Parallel): Doc =>
  typeof parallel === "number"
    ? fromValue(parallel)
    : map([{ key: "matrix", value: fromValue(parallel.matrix) }]);

/** A boolean stays a scalar; the map form carries the exit codes that do not fail the pipeline. */
export const allowFailureDoc = (allowFailure: AllowFailure): Doc =>
  typeof allowFailure === "boolean"
    ? fromValue(allowFailure)
    : map([{ key: "exit_codes", value: fromValue(allowFailure.exit_codes) }]);
