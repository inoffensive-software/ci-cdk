import {
  fail,
  fromValue,
  map,
  seq,
  type Diagnostic,
  type Doc,
  type DocEntry,
} from "../core/index.js";
import { keyPath, rawKeyPath } from "../core/paths.js";
import { rawEntries } from "../core/raw.js";
import type { PipelineConfig, PipelineItem, Pipe, ScriptItem } from "./types.js";
import { validate } from "./validate.js";

/** Keys already emitted at each level, so raw may not repeat them even when the field is absent. */
const DOCUMENT_RESERVED: readonly string[] = ["image", "pipelines"];
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

/** `default` is a sequence; each branch becomes `pattern: [ ... ]`, in array order. */
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

  const branches =
    pipelines.branches === undefined
      ? []
      : [
          {
            key: "branches",
            value: map(
              pipelines.branches.map((branch, index) => ({
                key: branch.pattern,
                value: seq(
                  branch.pipeline.map((item, itemIndex) =>
                    itemDoc(
                      item,
                      `$.pipelines.branches[${index}].pipeline[${itemIndex}]`,
                      diagnostics,
                    ),
                  ),
                ),
              })),
            ),
          },
        ];

  return map([...defaults, ...branches]);
};

/** Validates the whole document, then lowers it. Raw entries come last at each level. */
export const toDoc = (config: PipelineConfig): Doc => {
  const diagnostics: Diagnostic[] = [...validate(config)];

  const modelled = [
    ...entry("image", config.image === undefined ? undefined : fromValue(config.image)),
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
