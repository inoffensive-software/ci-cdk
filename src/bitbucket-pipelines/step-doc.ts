import { fromValue, map, seq, type Diagnostic, type Doc, type DocEntry } from "../core/index.js";
import { keyPath, rawKeyPath } from "../core/paths.js";
import { rawEntries } from "../core/raw.js";
import type {
  Changesets,
  Clone,
  Condition,
  FinalItem,
  Image,
  Pipe,
  ScriptItem,
  Step,
  StepItem,
} from "./types.js";

/** Keys the step emits, so raw may not repeat them even when the field is absent. */
const STEP_RESERVED: readonly string[] = [
  "after-script",
  "artifacts",
  "caches",
  "clone",
  "condition",
  "concurrency-group",
  "deployment",
  "environment",
  "fail-fast",
  "image",
  "max-time",
  "name",
  "oidc",
  "runs-on",
  "script",
  "services",
  "size",
  "trigger",
];

/** Only a declared field with a value is emitted; absent fields are not lowered at all. */
const entry = (key: string, value: Doc | undefined): readonly DocEntry[] =>
  value === undefined ? [] : [{ key, value }];

const isPipe = (item: ScriptItem): item is Pipe => typeof item !== "string" && "pipe" in item;

/** Pipe keys in schema order; variable maps keep the author's insertion order. */
const pipeDoc = (item: Pipe): Doc =>
  map([
    { key: "pipe", value: fromValue(item.pipe) },
    ...entry("variables", item.variables === undefined ? undefined : fromValue(item.variables)),
  ]);

/** A script is always a sequence: commands and pipe maps are the same list. */
const scriptDoc = (script: readonly ScriptItem[]): Doc =>
  seq(script.map((item) => (isPipe(item) ? pipeDoc(item) : fromValue(item))));

/** Clone: `depth`, `enabled`, `lfs`, `skip-ssl-verify`. Depth is never coerced. */
export const cloneDoc = (clone: Clone | undefined): Doc | undefined => {
  if (clone === undefined) {
    return undefined;
  }

  return map([
    ...entry("depth", clone.depth === undefined ? undefined : fromValue(clone.depth)),
    ...entry("enabled", clone.enabled === undefined ? undefined : fromValue(clone.enabled)),
    ...entry("lfs", clone.lfs === undefined ? undefined : fromValue(clone.lfs)),
    ...entry(
      "skip-ssl-verify",
      clone["skip-ssl-verify"] === undefined ? undefined : fromValue(clone["skip-ssl-verify"]),
    ),
  ]);
};

/** An image is a scalar, a name map, or a name map with credentials; map keys are alphabetical. */
export const imageDoc = (image: Image | undefined): Doc | undefined => {
  if (image === undefined) {
    return undefined;
  }

  if (typeof image === "string" || !("name" in image)) {
    return fromValue(image);
  }

  return map([
    { key: "name", value: fromValue(image.name) },
    ...entry("password", "password" in image ? fromValue(image.password) : undefined),
    ...entry("username", "username" in image ? fromValue(image.username) : undefined),
  ]);
};

/** Changesets: whichever list the author set; validation refuses neither or both. */
const changesetsDoc = (changesets: Changesets): Doc =>
  map([
    ...entry(
      "excludePaths",
      "excludePaths" in changesets ? fromValue(changesets.excludePaths) : undefined,
    ),
    ...entry(
      "includePaths",
      "includePaths" in changesets ? fromValue(changesets.includePaths) : undefined,
    ),
  ]);

/** Condition: `changesets` then `state`. */
export const conditionDoc = (condition: Condition): Doc =>
  map([
    ...entry(
      "changesets",
      condition.changesets === undefined ? undefined : changesetsDoc(condition.changesets),
    ),
    ...entry("state", condition.state === undefined ? undefined : fromValue(condition.state)),
  ]);

/** The first half of a step's keys, in the schema's alphabetical order. */
const headRows = (body: Step): readonly DocEntry[] => [
  ...entry(
    "after-script",
    body["after-script"] === undefined ? undefined : scriptDoc(body["after-script"]),
  ),
  ...entry("artifacts", body.artifacts === undefined ? undefined : fromValue(body.artifacts)),
  ...entry("caches", body.caches === undefined ? undefined : fromValue(body.caches)),
  ...entry("clone", cloneDoc(body.clone)),
  ...entry("condition", body.condition === undefined ? undefined : conditionDoc(body.condition)),
  ...entry(
    "concurrency-group",
    body["concurrency-group"] === undefined ? undefined : fromValue(body["concurrency-group"]),
  ),
  ...entry("deployment", body.deployment === undefined ? undefined : fromValue(body.deployment)),
];

/** The middle of a step's keys, from `environment` through `name`. */
const middleRows = (body: Step): readonly DocEntry[] => [
  ...entry("environment", body.environment === undefined ? undefined : fromValue(body.environment)),
  ...entry("fail-fast", body["fail-fast"] === undefined ? undefined : fromValue(body["fail-fast"])),
  ...entry("image", imageDoc(body.image)),
  ...entry("max-time", body["max-time"] === undefined ? undefined : fromValue(body["max-time"])),
  ...entry("name", body.name === undefined ? undefined : fromValue(body.name)),
];

/** The end of a step's keys; `script` is required and always emitted. */
const lastRows = (body: Step): readonly DocEntry[] => [
  ...entry("oidc", body.oidc === undefined ? undefined : fromValue(body.oidc)),
  ...entry("runs-on", body["runs-on"] === undefined ? undefined : fromValue(body["runs-on"])),
  { key: "script", value: scriptDoc(body.script) },
  ...entry("services", body.services === undefined ? undefined : fromValue(body.services)),
  ...entry("size", body.size === undefined ? undefined : fromValue(body.size)),
  ...entry("trigger", body.trigger === undefined ? undefined : fromValue(body.trigger)),
];

/** Step keys in Bitbucket's alphabetical schema order, then raw. */
const stepBodyDoc = (body: Step, bodyPath: string, diagnostics: Diagnostic[]): Doc => {
  const modelled = [...headRows(body), ...middleRows(body), ...lastRows(body)];

  return map([
    ...modelled,
    ...rawEntries(bodyPath, body.raw, modelled, diagnostics, STEP_RESERVED, rawKeyPath),
  ]);
};

/** Lowers a `step:` item body at its own path. */
export const stepDoc = (item: StepItem, itemPath: string, diagnostics: Diagnostic[]): Doc =>
  stepBodyDoc(item.step, keyPath(itemPath, "step"), diagnostics);

/** Lowers a `final:` item body at its own path. */
export const finalDoc = (item: FinalItem, itemPath: string, diagnostics: Diagnostic[]): Doc =>
  stepBodyDoc(item.final, keyPath(itemPath, "final"), diagnostics);
