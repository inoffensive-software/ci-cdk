import {
  DOC,
  entry,
  fromValue,
  map,
  present,
  seq,
  type Doc,
  type DocEntry,
  type LeafNode,
  type Text,
} from "../core/index.js";
import type {
  Artifacts,
  AutoCancel,
  Cache,
  CacheKeyFiles,
  Default,
  Image,
  Include,
  IncludeEntry,
  IncludeOptions,
  Need,
  NeedParallel,
  Retry,
  RetryOptions,
  Rule,
  RuleChanges,
  Scalar,
  Service,
  ServiceOptions,
  Workflow,
} from "./types.js";

/** A leaf decides its own style; every other object here is one of the provider's own shapes. */
const isLeaf = <T extends object>(value: LeafNode | T): value is LeafNode =>
  Object.hasOwn(value, DOC);

/** One cache or one include entry is the same shape as its list's element, so the list is the test. */
const isSequence = <T>(value: T | readonly T[]): value is readonly T[] => Array.isArray(value);

/**
 * An author-named scalar map. Lowering the whole record at once keeps insertion order and lets the
 * boundary parser carry a numeric-looking string as a string (ADR 0010).
 */
export const variablesDoc = (value: Readonly<Record<string, Scalar>>): Doc => fromValue(value);

/** A readonly array is not narrowed by `Array.isArray`, which only accepts a mutable one. */
const isPathList = (changes: RuleChanges): changes is readonly string[] => Array.isArray(changes);

const changesDoc = (changes: RuleChanges): Doc =>
  isPathList(changes)
    ? fromValue(changes)
    : map([
        { key: "paths", value: fromValue(changes.paths) },
        ...entry("compare_to", present(changes.compare_to)),
      ]);

const matrixDoc = (parallel: NeedParallel): Doc =>
  map([{ key: "matrix", value: fromValue(parallel.matrix) }]);

/** One need, in GitLab's documented key order; a bare job name stays a scalar. */
const needDoc = (need: Need): Doc =>
  typeof need === "string"
    ? fromValue(need)
    : map([
        { key: "job", value: fromValue(need.job) },
        ...entry("optional", present(need.optional)),
        ...entry("artifacts", present(need.artifacts)),
        ...entry("parallel", need.parallel === undefined ? undefined : matrixDoc(need.parallel)),
      ]);

export const needsDoc = (needs: readonly Need[]): Doc => seq(needs.map((need) => needDoc(need)));

/** One rule, in GitLab's documented key order; `variables` keeps the author's order. */
const ruleDoc = (rule: Rule): Doc =>
  map([
    ...entry("if", present(rule.if)),
    ...entry("changes", rule.changes === undefined ? undefined : changesDoc(rule.changes)),
    ...entry("exists", present(rule.exists)),
    ...entry("when", present(rule.when)),
    ...entry("allow_failure", present(rule.allow_failure)),
    ...entry("variables", rule.variables === undefined ? undefined : variablesDoc(rule.variables)),
    ...entry("needs", present(rule.needs)),
  ]);

export const rulesDoc = (rules: readonly Rule[]): Doc => seq(rules.map((rule) => ruleDoc(rule)));

const autoCancelDoc = (autoCancel: AutoCancel): Doc =>
  map([
    ...entry("on_new_commit", present(autoCancel.on_new_commit)),
    ...entry("on_job_failure", present(autoCancel.on_job_failure)),
  ]);

export const workflowDoc = (workflow: Workflow): Doc =>
  map([
    ...entry("name", present(workflow.name)),
    ...entry(
      "auto_cancel",
      workflow.auto_cancel === undefined ? undefined : autoCancelDoc(workflow.auto_cancel),
    ),
    ...entry("rules", workflow.rules === undefined ? undefined : rulesDoc(workflow.rules)),
  ]);

const includeTail = (item: IncludeOptions): readonly DocEntry[] => [
  ...entry("rules", item.rules === undefined ? undefined : rulesDoc(item.rules)),
  ...entry("integrity", present(item.integrity)),
];

const localEntryDoc = (item: IncludeOptions & { readonly local: Text }): Doc =>
  map([{ key: "local", value: fromValue(item.local) }, ...includeTail(item)]);

const remoteEntryDoc = (item: IncludeOptions & { readonly remote: Text }): Doc =>
  map([{ key: "remote", value: fromValue(item.remote) }, ...includeTail(item)]);

const templateEntryDoc = (item: IncludeOptions & { readonly template: Text }): Doc =>
  map([{ key: "template", value: fromValue(item.template) }, ...includeTail(item)]);

const projectEntryDoc = (item: Extract<IncludeEntry, { readonly project: Text }>): Doc =>
  map([
    { key: "project", value: fromValue(item.project) },
    ...entry("ref", present(item.ref)),
    { key: "file", value: fromValue(item.file) },
    ...includeTail(item),
  ]);

const componentEntryDoc = (item: Extract<IncludeEntry, { readonly component: Text }>): Doc =>
  map([
    { key: "component", value: fromValue(item.component) },
    ...entry("inputs", item.inputs === undefined ? undefined : variablesDoc(item.inputs)),
    ...includeTail(item),
  ]);

/** The discriminator decides the source, so each shape lowers on its own; the order is fixed. */
const includeEntryDoc = (item: IncludeEntry): Doc => {
  if ("local" in item) {
    return localEntryDoc(item);
  }

  if ("remote" in item) {
    return remoteEntryDoc(item);
  }

  if ("template" in item) {
    return templateEntryDoc(item);
  }

  if ("project" in item) {
    return projectEntryDoc(item);
  }

  return componentEntryDoc(item);
};

/** One entry stays one map, several stay a sequence: the author's shape is the data. */
export const includeDoc = (include: Include): Doc =>
  isSequence(include)
    ? seq(include.map((item) => includeEntryDoc(item)))
    : includeEntryDoc(include);

const serviceOptionsDoc = (service: ServiceOptions): Doc =>
  map([
    { key: "name", value: fromValue(service.name) },
    ...entry("alias", present(service.alias)),
    ...entry("entrypoint", present(service.entrypoint)),
    ...entry("command", present(service.command)),
    ...entry(
      "variables",
      service.variables === undefined ? undefined : variablesDoc(service.variables),
    ),
  ]);

const serviceDoc = (service: Service): Doc =>
  typeof service === "string" || isLeaf(service) ? fromValue(service) : serviceOptionsDoc(service);

export const servicesDoc = (services: readonly Service[]): Doc =>
  seq(services.map((item) => serviceDoc(item)));

const cacheKeyDoc = (key: CacheKeyFiles): Doc =>
  map([{ key: "files", value: fromValue(key.files) }, ...entry("prefix", present(key.prefix))]);

/** A key is a scalar when it is text, and a `files`/`prefix` map otherwise. */
const cacheKeyValueDoc = (key: Cache["key"]): Doc | undefined => {
  if (key === undefined) {
    return undefined;
  }

  if (typeof key === "string" || isLeaf(key)) {
    return fromValue(key);
  }

  return cacheKeyDoc(key);
};

const cacheItemDoc = (cache: Cache): Doc =>
  map([
    ...entry("key", cacheKeyValueDoc(cache.key)),
    { key: "paths", value: fromValue(cache.paths) },
    ...entry("policy", present(cache.policy)),
    ...entry("untracked", present(cache.untracked)),
    ...entry("when", present(cache.when)),
    ...entry("fallback_keys", present(cache.fallback_keys)),
  ]);

export const cacheDoc = (cache: Cache | readonly Cache[]): Doc =>
  isSequence(cache) ? seq(cache.map((item) => cacheItemDoc(item))) : cacheItemDoc(cache);

export const artifactsDoc = (artifacts: Artifacts): Doc =>
  map([
    ...entry("paths", present(artifacts.paths)),
    ...entry("exclude", present(artifacts.exclude)),
    ...entry("name", present(artifacts.name)),
    ...entry("expire_in", present(artifacts.expire_in)),
    ...entry("expose_as", present(artifacts.expose_as)),
    ...entry("public", present(artifacts.public)),
    ...entry("when", present(artifacts.when)),
    ...entry("reports", artifacts.reports === undefined ? undefined : fromValue(artifacts.reports)),
  ]);

const retryOptionsDoc = (retry: RetryOptions): Doc =>
  map([
    { key: "max", value: fromValue(retry.max) },
    ...entry("when", present(retry.when)),
    ...entry("exit_codes", present(retry.exit_codes)),
  ]);

/** A retry count stays a scalar; the map form keeps `max`, `when` and `exit_codes` in order. */
const retryDoc = (retry: Retry): Doc =>
  typeof retry === "number" ? fromValue(retry) : retryOptionsDoc(retry);

/** An image keeps its string form; the map form carries `name` first, then the overrides. */
export const imageDoc = (image: Image): Doc =>
  typeof image === "string" || isLeaf(image)
    ? fromValue(image)
    : map([
        { key: "name", value: fromValue(image.name) },
        ...entry("entrypoint", present(image.entrypoint)),
        ...entry("pull_policy", present(image.pull_policy)),
      ]);

/** The `default` body, in the spec's fixed order; an absent key emits nothing. */
export const defaultDoc = (defaults: Default): Doc =>
  map([
    ...entry("image", defaults.image === undefined ? undefined : imageDoc(defaults.image)),
    ...entry(
      "services",
      defaults.services === undefined ? undefined : servicesDoc(defaults.services),
    ),
    ...entry("tags", present(defaults.tags)),
    ...entry("before_script", present(defaults.before_script)),
    ...entry("after_script", present(defaults.after_script)),
    ...entry("cache", defaults.cache === undefined ? undefined : cacheDoc(defaults.cache)),
    ...entry(
      "artifacts",
      defaults.artifacts === undefined ? undefined : artifactsDoc(defaults.artifacts),
    ),
    ...entry("retry", defaults.retry === undefined ? undefined : retryDoc(defaults.retry)),
    ...entry("timeout", present(defaults.timeout)),
    ...entry("interruptible", present(defaults.interruptible)),
  ]);
