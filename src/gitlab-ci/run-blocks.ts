import {
  DOC,
  entry,
  fromValue,
  map,
  seq,
  type Doc,
  type DocEntry,
  type Text,
} from "../core/index.js";
import type {
  FunctionReference,
  FunctionStep,
  GitFunction,
  OciFunction,
  ScriptStep,
  Step,
} from "./run-types.js";

/** A plain reference decides its own scalar style; a map names the source it loads from. */
const isLeaf = (func: FunctionReference): func is Text =>
  typeof func === "string" || Object.hasOwn(func, DOC);

const gitEntries = (git: GitFunction): DocEntry[] => [
  { key: "url", value: fromValue(git.url) },
  { key: "rev", value: fromValue(git.rev) },
  ...entry("dir", git.dir === undefined ? undefined : fromValue(git.dir)),
  ...entry("file", git.file === undefined ? undefined : fromValue(git.file)),
];

const ociEntries = (oci: OciFunction): DocEntry[] => [
  { key: "registry", value: fromValue(oci.registry) },
  { key: "repository", value: fromValue(oci.repository) },
  { key: "tag", value: fromValue(oci.tag) },
  ...entry("dir", oci.dir === undefined ? undefined : fromValue(oci.dir)),
  ...entry("file", oci.file === undefined ? undefined : fromValue(oci.file)),
];

/** The reference, in the shape the author wrote: a scalar, or the map with one source key. */
const funcDoc = (func: FunctionReference): Doc => {
  if (isLeaf(func)) {
    return fromValue(func);
  }

  return "git" in func
    ? map([{ key: "git", value: map(gitEntries(func.git)) }])
    : map([{ key: "oci", value: map(ociEntries(func.oci)) }]);
};

/** A function step carries `inputs`; a script step does not, so the two lower separately. */
const functionStepEntries = (step: FunctionStep): readonly DocEntry[] => [
  { key: "name", value: fromValue(step.name) },
  { key: "func", value: funcDoc(step.func) },
  ...entry("inputs", step.inputs === undefined ? undefined : fromValue(step.inputs)),
  ...entry("env", step.env === undefined ? undefined : fromValue(step.env)),
];

const scriptStepEntries = (step: ScriptStep): readonly DocEntry[] => [
  { key: "name", value: fromValue(step.name) },
  { key: "script", value: fromValue(step.script) },
  ...entry("env", step.env === undefined ? undefined : fromValue(step.env)),
];

/**
 * One `run` entry, in the docs' order: `name`, then the function or script, then `inputs` and
 * `env`. The union is the discriminator, so a step is never emitted with both.
 */
export const stepsDoc = (steps: readonly Step[]): Doc =>
  seq(
    steps.map((step) => map("func" in step ? functionStepEntries(step) : scriptStepEntries(step))),
  );
