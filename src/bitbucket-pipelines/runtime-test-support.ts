import { parse } from "yaml";

import {
  type Image,
  type Options,
  type PipelineConfig,
  type Runtime,
  type ScriptItem,
  type Step,
  pipelineConfig,
  render,
  step,
} from "./index.js";

export interface ParsedStepBody {
  readonly image?: Image;
  readonly runtime?: Runtime;
  readonly script?: readonly ScriptItem[];
}

export interface ParsedDocument {
  readonly image?: Image;
  readonly options?: Options;
  readonly definitions?: {
    readonly services?: Readonly<Record<string, { readonly image?: Image }>>;
  };
  readonly pipelines: {
    readonly default: readonly { readonly step: ParsedStepBody }[];
  };
}

export const withStep = (body: Step): PipelineConfig =>
  pipelineConfig({ pipelines: { default: [step(body)] } });

export const parsed = (config: PipelineConfig): ParsedDocument =>
  parse(render(config, { header: "" }));

export const stepOf = (config: PipelineConfig): ParsedStepBody => {
  const first = parsed(config).pipelines.default[0];

  if (first === undefined) {
    throw new TypeError("expected a step");
  }

  return first.step;
};
