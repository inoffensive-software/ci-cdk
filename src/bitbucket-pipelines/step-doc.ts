import {
  entry,
  fromValue,
  map,
  seq,
  type Diagnostic,
  type Doc,
  type DocEntry,
} from "../core/index.js";
import { keyPath, rawKeyPath } from "../core/paths.js";
import { runtimeDoc } from "./runtime-doc.js";
import { rawEntries } from "../core/raw.js";
import type {
  Artifacts,
  ArtifactUpload,
  Changesets,
  Clone,
  Condition,
  FinalItem,
  Image,
  ImageAws,
  Pipe,
  ScriptItem,
  Step,
  StepAuth,
  StepItem,
} from "./types.js";

/** Keys the step emits, so raw may not repeat them even when the field is absent. */
const STEP_RESERVED: readonly string[] = [
  "after-script",
  "artifacts",
  "auth",
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
  "output-variables",
  "runs-on",
  "runtime",
  "script",
  "services",
  "size",
  "trigger",
];

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

/** An image's AWS map: `access-key`/`secret-key`, or `oidc-role`. */
const imageAwsDoc = (aws: ImageAws): Doc =>
  "oidc-role" in aws
    ? map([{ key: "oidc-role", value: fromValue(aws["oidc-role"]) }])
    : map([
        { key: "access-key", value: fromValue(aws["access-key"]) },
        { key: "secret-key", value: fromValue(aws["secret-key"]) },
      ]);

/** An image is a scalar or a name map; map keys are alphabetical, absent keys omitted. */
export const imageDoc = (image: Image | undefined): Doc | undefined => {
  if (image === undefined) {
    return undefined;
  }

  if (typeof image === "string" || !("name" in image)) {
    return fromValue(image);
  }

  return map([
    ...entry("aws", "aws" in image ? imageAwsDoc(image.aws) : undefined),
    { key: "name", value: fromValue(image.name) },
    ...entry("password", "password" in image ? fromValue(image.password) : undefined),
    ...entry(
      "run-as-user",
      image["run-as-user"] === undefined ? undefined : fromValue(image["run-as-user"]),
    ),
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

/** An artifacts map is everything the list form is not. */
const isArtifactsMap = (artifacts: Artifacts): artifacts is Exclude<Artifacts, readonly string[]> =>
  !Array.isArray(artifacts);

/** An upload entry is `capture-on`, `depth`, `ignore-paths`, `name`, `paths`, `type`; absent keys go. */
const uploadDoc = (upload: ArtifactUpload): Doc =>
  map([
    ...entry(
      "capture-on",
      upload["capture-on"] === undefined ? undefined : fromValue(upload["capture-on"]),
    ),
    ...entry("depth", upload.depth === undefined ? undefined : fromValue(upload.depth)),
    ...entry(
      "ignore-paths",
      upload["ignore-paths"] === undefined ? undefined : fromValue(upload["ignore-paths"]),
    ),
    { key: "name", value: fromValue(upload.name) },
    { key: "paths", value: fromValue(upload.paths) },
    ...entry("type", upload.type === undefined ? undefined : fromValue(upload.type)),
  ]);

/** Artifacts: the path list as-is, or `download`, `paths`, `upload` with absent keys omitted. */
const artifactsDoc = (artifacts: Artifacts | undefined): Doc | undefined => {
  if (artifacts === undefined) {
    return undefined;
  }

  if (!isArtifactsMap(artifacts)) {
    return fromValue(artifacts);
  }

  return map([
    ...entry(
      "download",
      artifacts.download === undefined ? undefined : fromValue(artifacts.download),
    ),
    ...entry("paths", artifacts.paths === undefined ? undefined : fromValue(artifacts.paths)),
    ...entry(
      "upload",
      artifacts.upload === undefined
        ? undefined
        : seq(artifacts.upload.map((item) => uploadDoc(item))),
    ),
  ]);
};

/** Auth: `system`, then `scopes`; each absent layer is omitted. */
const authDoc = (auth: StepAuth | undefined): Doc | undefined => {
  if (auth === undefined) {
    return undefined;
  }

  const system =
    auth.system === undefined
      ? undefined
      : map([
          ...entry(
            "scopes",
            auth.system.scopes === undefined ? undefined : fromValue(auth.system.scopes),
          ),
        ]);

  return map([...entry("system", system)]);
};

/** The first half of a step's keys, in the schema's alphabetical order. */
const headRows = (body: Step): readonly DocEntry[] => [
  ...entry(
    "after-script",
    body["after-script"] === undefined ? undefined : scriptDoc(body["after-script"]),
  ),
  ...entry("artifacts", artifactsDoc(body.artifacts)),
  ...entry("auth", authDoc(body.auth)),
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
  ...entry(
    "output-variables",
    body["output-variables"] === undefined ? undefined : fromValue(body["output-variables"]),
  ),
  ...entry("runs-on", body["runs-on"] === undefined ? undefined : fromValue(body["runs-on"])),
  ...entry("runtime", runtimeDoc(body.runtime)),
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
