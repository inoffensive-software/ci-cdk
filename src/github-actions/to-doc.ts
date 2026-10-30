import {
  block,
  fail,
  fromValue,
  map,
  seq,
  type Diagnostic,
  type Doc,
  type DocEntry,
  type Text,
  type Value,
} from "../core/index.js";
import { rawEntries } from "../core/raw.js";
import { onDoc } from "./on-doc.js";
import type {
  Concurrency,
  Container,
  Defaults,
  Environment,
  Job,
  RunDefaults,
  Scalar,
  Step,
  Strategy,
  Workflow,
} from "./types.js";
import { validate } from "./validate.js";

/** Only a declared field with a value is emitted; absent fields are not lowered at all. */
const entry = (key: string, value: Doc | undefined): readonly DocEntry[] =>
  value === undefined ? [] : [{ key, value }];

/** Everything a modelled field can hold without building a `Doc` by hand. */
type Presentable = Scalar | Value | Readonly<Record<string, Scalar>>;

const present = (value: Presentable | undefined): Doc | undefined =>
  value === undefined ? undefined : fromValue(value);

/** A plain string is shell text; a leaf carries its own style. */
const run = (value: Text | undefined): Doc | undefined => {
  if (value === undefined) {
    return undefined;
  }

  return typeof value === "string" ? block(value) : fromValue(value);
};

const stepDoc = (step: Step, path: string, diagnostics: Diagnostic[]): Doc => {
  const modelled = [
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
  ];

  return map([...modelled, ...rawEntries(path, step.raw, modelled, diagnostics)]);
};

const runDefaultsDoc = (runDefaults: RunDefaults): Doc =>
  map([
    ...entry("shell", present(runDefaults.shell)),
    ...entry("working-directory", present(runDefaults["working-directory"])),
  ]);

const defaultsDoc = (defaults: Defaults): Doc =>
  map([...entry("run", defaults.run === undefined ? undefined : runDefaultsDoc(defaults.run))]);

const concurrencyDoc = (concurrency: Concurrency): Doc => {
  if (typeof concurrency === "string") {
    return fromValue(concurrency);
  }

  return map([
    { key: "group", value: fromValue(concurrency.group) },
    ...entry("cancel-in-progress", present(concurrency["cancel-in-progress"])),
  ]);
};

const environmentDoc = (environment: Environment): Doc => {
  if (typeof environment === "string") {
    return fromValue(environment);
  }

  return map([
    { key: "name", value: fromValue(environment.name) },
    ...entry("url", present(environment.url)),
    ...entry("deployment", present(environment.deployment)),
  ]);
};

/** Credentials go through the boundary parser so the author's key order survives. */
const containerDoc = (container: Container): Doc =>
  map([
    { key: "image", value: fromValue(container.image) },
    ...entry(
      "credentials",
      container.credentials === undefined ? undefined : fromValue(container.credentials),
    ),
    ...entry("env", present(container.env)),
    ...entry("ports", present(container.ports)),
    ...entry("volumes", present(container.volumes)),
    ...entry("options", present(container.options)),
  ]);

const servicesDoc = (services: Readonly<Record<string, Container>>): Doc =>
  map(Object.entries(services).map(([id, service]) => ({ key: id, value: containerDoc(service) })));

/**
 * `fail-fast` first, then the matrix, following the pinned configs rather than the documented order
 * (ADR 0004). `max-parallel` has no corpus evidence yet, so it keeps its documented last position.
 */
const strategyDoc = (strategy: Strategy): Doc =>
  map([
    ...entry("fail-fast", present(strategy["fail-fast"])),
    ...entry("matrix", strategy.matrix === undefined ? undefined : fromValue(strategy.matrix)),
    ...entry("max-parallel", present(strategy["max-parallel"])),
  ]);

const jobDoc = (job: Job, path: string, diagnostics: Diagnostic[]): Doc => {
  const modelled = [
    ...entry("name", present(job.name)),
    ...entry("permissions", job.permissions === undefined ? undefined : fromValue(job.permissions)),
    ...entry("cache-mode", present(job["cache-mode"])),
    ...entry("needs", present(job.needs)),
    ...entry("if", present(job.if)),
    ...entry("runs-on", present(job["runs-on"])),
    ...entry("strategy", job.strategy === undefined ? undefined : strategyDoc(job.strategy)),
    ...entry(
      "environment",
      job.environment === undefined ? undefined : environmentDoc(job.environment),
    ),
    ...entry(
      "concurrency",
      job.concurrency === undefined ? undefined : concurrencyDoc(job.concurrency),
    ),
    ...entry("outputs", present(job.outputs)),
    ...entry("env", present(job.env)),
    ...entry("defaults", job.defaults === undefined ? undefined : defaultsDoc(job.defaults)),
    ...entry(
      "steps",
      job.steps === undefined
        ? undefined
        : seq(
            job.steps.map((item, index) => stepDoc(item, `${path}.steps[${index}]`, diagnostics)),
          ),
    ),
    ...entry("timeout-minutes", present(job["timeout-minutes"])),
    ...entry("continue-on-error", present(job["continue-on-error"])),
    ...entry("container", job.container === undefined ? undefined : containerDoc(job.container)),
    ...entry("services", job.services === undefined ? undefined : servicesDoc(job.services)),
    ...entry("uses", present(job.uses)),
    ...entry("with", present(job.with)),
    ...entry("secrets", present(job.secrets)),
  ];

  return map([...modelled, ...rawEntries(path, job.raw, modelled, diagnostics, ["id"])]);
};

/**
 * Validates the whole document, collects every problem, then lowers it. `jobs` is an array on the
 * struct so composition is spread and concat; it becomes a map keyed by id here, in array order,
 * with `id` stripped from the body.
 */
export const toDoc = (workflow: Workflow): Doc => {
  const diagnostics: Diagnostic[] = [...validate(workflow)];

  const modelled = [
    { key: "name", value: fromValue(workflow.name) },
    ...entry("run-name", present(workflow["run-name"])),
    { key: "on", value: onDoc(workflow.on) },
    ...entry(
      "permissions",
      workflow.permissions === undefined ? undefined : fromValue(workflow.permissions),
    ),
    ...entry("cache-mode", present(workflow["cache-mode"])),
    ...entry("env", present(workflow.env)),
    ...entry(
      "defaults",
      workflow.defaults === undefined ? undefined : defaultsDoc(workflow.defaults),
    ),
    ...entry(
      "concurrency",
      workflow.concurrency === undefined ? undefined : concurrencyDoc(workflow.concurrency),
    ),
    {
      key: "jobs",
      value: map(
        workflow.jobs.map((job, index) => ({
          key: job.id,
          value: jobDoc(job, `$.jobs[${index}]`, diagnostics),
        })),
      ),
    },
  ];

  const doc = map([...modelled, ...rawEntries("$", workflow.raw, modelled, diagnostics)]);

  if (diagnostics.length > 0) {
    fail(...diagnostics);
  }

  return doc;
};
