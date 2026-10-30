import {
  block,
  fromValue,
  map,
  seq,
  type Doc,
  type DocEntry,
  type Text,
  type Value,
} from "../core/index.js";
import type {
  Concurrency,
  Container,
  Defaults,
  Environment,
  Job,
  RunDefaults,
  Step,
  Strategy,
  Workflow,
} from "./types.js";

/** Only a declared field with a value is emitted; absent fields are not lowered at all. */
const entry = (key: string, value: Doc | undefined): readonly DocEntry[] =>
  value === undefined ? [] : [{ key, value }];

const present = <T extends Text | Value | Readonly<Record<string, Text>>>(
  value: T | undefined,
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

const strategyDoc = (strategy: Strategy): Doc =>
  map([
    ...entry("matrix", present(strategy.matrix)),
    ...entry("fail-fast", present(strategy["fail-fast"])),
    ...entry("max-parallel", present(strategy["max-parallel"])),
  ]);

const jobDoc = (job: Job): Doc =>
  map([
    ...entry("name", present(job.name)),
    ...entry("permissions", job.permissions === undefined ? undefined : fromValue(job.permissions)),
    ...entry("needs", present(job.needs)),
    ...entry("if", present(job.if)),
    ...entry("runs-on", present(job["runs-on"])),
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
    ...entry("steps", job.steps === undefined ? undefined : seq(job.steps.map(stepDoc))),
    ...entry("timeout-minutes", present(job["timeout-minutes"])),
    ...entry("strategy", job.strategy === undefined ? undefined : strategyDoc(job.strategy)),
    ...entry("continue-on-error", present(job["continue-on-error"])),
    ...entry("container", job.container === undefined ? undefined : containerDoc(job.container)),
    ...entry("services", job.services === undefined ? undefined : servicesDoc(job.services)),
    ...entry("uses", present(job.uses)),
    ...entry("with", present(job.with)),
    ...entry("secrets", present(job.secrets)),
  ]);

/**
 * The single lowering pass. `jobs` is an array on the struct so composition is spread and concat;
 * it becomes a map keyed by id here, in array order, with `id` stripped from the body.
 */
export const toDoc = (workflow: Workflow): Doc =>
  map([
    { key: "name", value: fromValue(workflow.name) },
    { key: "on", value: fromValue(workflow.on) },
    ...entry(
      "permissions",
      workflow.permissions === undefined ? undefined : fromValue(workflow.permissions),
    ),
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
      value: map(workflow.jobs.map((job) => ({ key: job.id, value: jobDoc(job) }))),
    },
  ]);
