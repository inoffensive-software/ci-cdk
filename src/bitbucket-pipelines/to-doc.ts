import {
  fail,
  fromValue,
  map,
  seq,
  type Diagnostic,
  type Doc,
  type DocEntry,
  type Text,
} from "../core/index.js";
import { keyPath, rawKeyPath } from "../core/paths.js";
import { rawEntries } from "../core/raw.js";
import type {
  Cache,
  PipelineConfig,
  PipelineItem,
  Pipelines,
  Pipe,
  ScriptItem,
  SelectorPipeline,
  Service,
} from "./types.js";
import { validate } from "./validate.js";

/** Keys already emitted at each level, so raw may not repeat them even when the field is absent. */
const DOCUMENT_RESERVED: readonly string[] = [
  "clone",
  "definitions",
  "image",
  "options",
  "pipelines",
];

const STEP_RESERVED: readonly string[] = ["name", "oidc", "script"];

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

/** Step keys in Bitbucket's alphabetical schema order, then raw. */
const stepDoc = (item: PipelineItem, itemPath: string, diagnostics: Diagnostic[]): Doc => {
  const { step: body } = item;
  const stepPath = keyPath(itemPath, "step");

  const modelled = [
    ...entry("name", body.name === undefined ? undefined : fromValue(body.name)),
    ...entry("oidc", body.oidc === undefined ? undefined : fromValue(body.oidc)),
    { key: "script", value: scriptDoc(body.script) },
  ];

  return map([
    ...modelled,
    ...rawEntries(stepPath, body.raw, modelled, diagnostics, STEP_RESERVED, rawKeyPath),
  ]);
};

/** An item is a one-key map; the alias has one form today and widens without changing this shape. */
const itemDoc = (item: PipelineItem, itemPath: string, diagnostics: Diagnostic[]): Doc =>
  map([{ key: "step", value: stepDoc(item, itemPath, diagnostics) }]);

/** A cache is either its path or the `path`/`key` map; a key names the files it hashes. */
const isCacheMap = (
  cache: Cache,
): cache is { readonly path: Text; readonly key?: { readonly files: readonly string[] } } =>
  typeof cache === "object" && cache !== null && "path" in cache;

const cacheDoc = (cache: Cache): Doc =>
  isCacheMap(cache)
    ? map([
        { key: "path", value: fromValue(cache.path) },
        ...entry(
          "key",
          cache.key === undefined
            ? undefined
            : map([{ key: "files", value: fromValue(cache.key.files) }]),
        ),
      ])
    : fromValue(cache);

/** Service keys in the schema's order; variable maps keep the author's insertion order. */
const serviceDoc = (service: Service): Doc =>
  map([
    ...entry("image", service.image === undefined ? undefined : fromValue(service.image)),
    ...entry("memory", service.memory === undefined ? undefined : fromValue(service.memory)),
    ...entry("type", service.type === undefined ? undefined : fromValue(service.type)),
    ...entry(
      "variables",
      service.variables === undefined ? undefined : fromValue(service.variables),
    ),
  ]);

/** Author-named records keep insertion order, because a record is the only ordered map we get. */
const namedDoc = <T>(record: Readonly<Record<string, T>>, lower: (value: T) => Doc): Doc =>
  map(Object.entries(record).map(([key, value]) => ({ key, value: lower(value) })));

/** Definitions: `caches`, `services`, `steps`, then nothing else. */
const definitionsDoc = (config: PipelineConfig, diagnostics: Diagnostic[]): Doc | undefined => {
  const definitions = config.definitions;

  if (definitions === undefined) {
    return undefined;
  }

  const rows = [
    ...entry(
      "caches",
      definitions.caches === undefined ? undefined : namedDoc(definitions.caches, cacheDoc),
    ),
    ...entry(
      "services",
      definitions.services === undefined ? undefined : namedDoc(definitions.services, serviceDoc),
    ),
    ...entry(
      "steps",
      definitions.steps === undefined
        ? undefined
        : seq(
            definitions.steps.map((item, index) =>
              itemDoc(item, `$.definitions.steps[${index}]`, diagnostics),
            ),
          ),
    ),
  ];

  return map(rows);
};

/** Options: `docker`, `max-time`, `runs-on`, `size`. */
const optionsDoc = (config: PipelineConfig): Doc | undefined => {
  const options = config.options;

  if (options === undefined) {
    return undefined;
  }

  return map([
    ...entry("docker", options.docker === undefined ? undefined : fromValue(options.docker)),
    ...entry(
      "max-time",
      options["max-time"] === undefined ? undefined : fromValue(options["max-time"]),
    ),
    ...entry(
      "runs-on",
      options["runs-on"] === undefined ? undefined : fromValue(options["runs-on"]),
    ),
    ...entry("size", options.size === undefined ? undefined : fromValue(options.size)),
  ]);
};

/** Clone: `depth`, `enabled`, `lfs`, `skip-ssl-verify`. Depth is never coerced. */
const cloneDoc = (config: PipelineConfig): Doc | undefined => {
  const clone = config.clone;

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

/** One selector section: `pattern: [ ...items ]`, entries in array order. */
const selectorDoc = (
  section: keyof Pipelines,
  entries: readonly SelectorPipeline[] | undefined,
  diagnostics: Diagnostic[],
): readonly DocEntry[] => {
  if (entries === undefined) {
    return [];
  }

  const sectionPath = keyPath("$.pipelines", section);

  return [
    {
      key: section,
      value: map(
        entries.map((selector, index) => ({
          key: selector.pattern,
          value: seq(
            selector.pipeline.map((item, itemIndex) =>
              itemDoc(item, `${sectionPath}[${index}].pipeline[${itemIndex}]`, diagnostics),
            ),
          ),
        })),
      ),
    },
  ];
};

/** Pipelines: `default`, `branches`, `tags`, `pull-requests`. */
const pipelinesDoc = (config: PipelineConfig, diagnostics: Diagnostic[]): Doc => {
  const { pipelines } = config;

  const defaults =
    pipelines.default === undefined
      ? []
      : [
          {
            key: "default",
            value: seq(
              pipelines.default.map((item, index) =>
                itemDoc(item, `$.pipelines.default[${index}]`, diagnostics),
              ),
            ),
          },
        ];

  return map([
    ...defaults,
    ...selectorDoc("branches", pipelines.branches, diagnostics),
    ...selectorDoc("tags", pipelines.tags, diagnostics),
    ...selectorDoc("pull-requests", pipelines["pull-requests"], diagnostics),
  ]);
};

/** Validates the whole document, then lowers it. Raw entries come last at each level. */
export const toDoc = (config: PipelineConfig): Doc => {
  const diagnostics: Diagnostic[] = [...validate(config)];

  const definitions = definitionsDoc(config, diagnostics);

  const modelled = [
    ...entry("clone", cloneDoc(config)),
    ...entry("definitions", definitions),
    ...entry("image", config.image === undefined ? undefined : fromValue(config.image)),
    ...entry("options", optionsDoc(config)),
    { key: "pipelines", value: pipelinesDoc(config, diagnostics) },
  ];

  const doc = map([
    ...modelled,
    ...rawEntries("$", config.raw, modelled, diagnostics, DOCUMENT_RESERVED, rawKeyPath),
  ]);

  if (diagnostics.length > 0) {
    fail(...diagnostics);
  }

  return doc;
};
