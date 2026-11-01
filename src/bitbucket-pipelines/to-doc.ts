import {
  entry,
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
import { itemDoc } from "./item-doc.js";
import { runtimeDoc } from "./runtime-doc.js";
import { agentDefinitionDoc } from "./script-doc.js";
import { cloneDoc, imageDoc } from "./step-doc.js";
import type {
  Cache,
  CustomVariable,
  NamedPipeline,
  PipelineConfig,
  Pipelines,
  SelectorPipeline,
  Service,
  TriggerConfig,
} from "./types.js";
import { validate } from "./validate.js";

/** Keys already emitted at each level, so raw may not repeat them even when the field is absent. */
const DOCUMENT_RESERVED: readonly string[] = [
  "clone",
  "definitions",
  "image",
  "labels",
  "options",
  "pipelines",
  "triggers",
];

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
    ...entry("image", imageDoc(service.image)),
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

/** Definitions: `agents`, `caches`, `services`, `steps`, the schema's alphabetical order. */
const definitionsDoc = (config: PipelineConfig, diagnostics: Diagnostic[]): Doc | undefined => {
  const definitions = config.definitions;

  if (definitions === undefined) {
    return undefined;
  }

  const rows = [
    ...entry(
      "agents",
      definitions.agents === undefined
        ? undefined
        : namedDoc(definitions.agents, agentDefinitionDoc),
    ),
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

/** Options: `docker`, `max-time`, `runs-on`, `runtime`, `size`. */
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
    ...entry("runtime", runtimeDoc(options.runtime)),
    ...entry("size", options.size === undefined ? undefined : fromValue(options.size)),
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

/** One variable: `allowed-values`, `default`, `description`, `name`, with absent keys omitted. */
const variableDoc = (variable: CustomVariable): Doc =>
  map([
    ...entry(
      "allowed-values",
      variable["allowed-values"] === undefined ? undefined : fromValue(variable["allowed-values"]),
    ),
    ...entry("default", variable.default === undefined ? undefined : fromValue(variable.default)),
    ...entry(
      "description",
      variable.description === undefined ? undefined : fromValue(variable.description),
    ),
    { key: "name", value: fromValue(variable.name) },
  ]);

/** The leading `variables` item a custom pipeline carries, before its own items. */
const variablesItem = (variables: readonly CustomVariable[]): Doc =>
  map([{ key: "variables", value: seq(variables.map((variable) => variableDoc(variable))) }]);

/** One custom section: `name: [ ...items ]`, entries in array order. */
const customDoc = (
  entries: readonly NamedPipeline[] | undefined,
  diagnostics: Diagnostic[],
): readonly DocEntry[] => {
  if (entries === undefined) {
    return [];
  }

  return [
    {
      key: "custom",
      value: map(
        entries.map((entryValue, index) => ({
          key: entryValue.name,
          value: seq([
            ...(entryValue.variables === undefined ? [] : [variablesItem(entryValue.variables)]),
            ...entryValue.pipeline.map((item, itemIndex) =>
              itemDoc(item, `$.pipelines.custom[${index}].pipeline[${itemIndex}]`, diagnostics),
            ),
          ]),
        })),
      ),
    },
  ];
};

/** Pipelines: `default`, `branches`, `tags`, `pull-requests`, `custom`. */
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
    ...customDoc(pipelines.custom, diagnostics),
  ]);
};

/** One trigger entry: `condition` then `pipelines`, the schema's order. */
const triggerDoc = (trigger: TriggerConfig): Doc =>
  map([
    { key: "condition", value: fromValue(trigger.condition) },
    { key: "pipelines", value: fromValue(trigger.pipelines) },
  ]);

/** Triggers: one author-named key per trigger type, entries in array order. */
const triggersDoc = (config: PipelineConfig): Doc | undefined => {
  const triggers = config.triggers;

  if (triggers === undefined) {
    return undefined;
  }

  return namedDoc(triggers, (entries) => seq(entries.map((trigger) => triggerDoc(trigger))));
};

/** Validates the whole document, then lowers it. Raw entries come last at each level. */
export const toDoc = (config: PipelineConfig): Doc => {
  const diagnostics: Diagnostic[] = [...validate(config)];

  const definitions = definitionsDoc(config, diagnostics);

  const modelled = [
    ...entry("clone", cloneDoc(config.clone)),
    ...entry("definitions", definitions),
    ...entry("image", imageDoc(config.image)),
    ...entry(
      "labels",
      config.labels === undefined
        ? undefined
        : namedDoc(config.labels, (value) => fromValue(value)),
    ),
    ...entry("options", optionsDoc(config)),
    { key: "pipelines", value: pipelinesDoc(config, diagnostics) },
    ...entry("triggers", triggersDoc(config)),
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
