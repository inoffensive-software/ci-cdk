import { DOC, entry, fromValue, map, present, type Doc, type LeafNode } from "../core/index.js";
import { type AllowFailure, type Environment, type Parallel, type Release } from "./types.js";

/** A leaf decides its own style; a bare environment name is a leaf, a map is this provider's shape. */
const isLeaf = (value: Environment): value is LeafNode =>
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
