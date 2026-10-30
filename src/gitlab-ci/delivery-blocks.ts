import { DOC, entry, fromValue, map, present, type Doc, type LeafNode } from "../core/index.js";
import { includeDoc } from "./blocks.js";
import { type Trigger } from "./trigger-types.js";
import { type AllowFailure, type Environment, type Parallel, type Release } from "./types.js";

/** A leaf decides its own style; a bare name or path is a scalar, a map is this provider's shape. */
const isLeaf = (value: Environment | Trigger): value is LeafNode =>
  typeof value === "object" && Object.hasOwn(value, DOC);

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
    ]);
  }

  return map([
    { key: "include", value: includeDoc(trigger.include) },
    ...entry("strategy", present(trigger.strategy)),
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
