import { describe, expect, it } from "vitest";

import { DiagnosticError, type Diagnostic, type Value } from "../core/index.js";
import {
  type PipelineConfig,
  type Pipelines,
  type ScriptItem,
  pipelineConfig,
  pipe,
  render,
  step,
} from "./index.js";

const diagnosticsOf = (config: PipelineConfig): readonly Diagnostic[] => {
  try {
    render(config);
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics;
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

const pairsOf = (config: PipelineConfig): readonly { path: string; message: string }[] =>
  diagnosticsOf(config).map(({ path, message }) => ({ path, message }));

const withDefault = (script: readonly ScriptItem[]): PipelineConfig =>
  pipelineConfig({ pipelines: { default: [step({ script })] } });

const branch = (pattern: string): Pipelines => ({
  branches: [{ pattern, pipeline: [step({ script: ["true"] })] }],
});

const withRaw = (raw: Readonly<Record<string, Value>>): PipelineConfig =>
  pipelineConfig({ pipelines: { default: [step({ script: ["true"] })] }, raw });

const stepRaw = (raw: Readonly<Record<string, Value>>): PipelineConfig =>
  pipelineConfig({ pipelines: { default: [step({ script: ["true"], raw })] } });

describe("pipelines", () => {
  it("refuses a document with no pipeline section", () => {
    expect(pairsOf(pipelineConfig({ pipelines: {} }))).toStrictEqual([
      { path: "$.pipelines", message: "pipelines must declare at least one pipeline" },
    ]);
  });

  it("refuses an empty default pipeline", () => {
    expect(pairsOf(pipelineConfig({ pipelines: { default: [] } }))).toStrictEqual([
      { path: "$.pipelines.default", message: "pipeline must contain at least one item" },
    ]);
  });

  it("refuses an empty branch pipeline", () => {
    expect(
      pairsOf(pipelineConfig({ pipelines: { branches: [{ pattern: "main", pipeline: [] }] } })),
    ).toStrictEqual([
      {
        path: "$.pipelines.branches[0].pipeline",
        message: "pipeline must contain at least one item",
      },
    ]);
  });
});

describe("selector patterns", () => {
  it("refuses an empty pattern", () => {
    expect(pairsOf(pipelineConfig({ pipelines: branch("") }))).toStrictEqual([
      { path: "$.pipelines.branches[0].pattern", message: "pattern must not be empty" },
    ]);
  });

  it("refuses a duplicate at the later entry", () => {
    expect(
      pairsOf(
        pipelineConfig({
          pipelines: {
            branches: [
              { pattern: "main", pipeline: [step({ script: ["one"] })] },
              { pattern: "main", pipeline: [step({ script: ["two"] })] },
            ],
          },
        }),
      ),
    ).toStrictEqual([
      {
        path: "$.pipelines.branches[1].pattern",
        message: 'duplicate pattern "main": two pipelines for one branch',
      },
    ]);
  });
});

describe("steps", () => {
  it("refuses an empty script", () => {
    expect(pairsOf(withDefault([]))).toStrictEqual([
      {
        path: "$.pipelines.default[0].step.script",
        message: "script must contain at least one command",
      },
    ]);
  });

  it("refuses an empty pipe id", () => {
    expect(pairsOf(withDefault([pipe({ pipe: "" })]))).toStrictEqual([
      { path: "$.pipelines.default[0].step.script[0].pipe", message: "pipe must not be empty" },
    ]);
  });

  it("walks through the item wrapper inside a branch pipeline", () => {
    expect(
      pairsOf(
        pipelineConfig({
          pipelines: {
            branches: [{ pattern: "main", pipeline: [step({ script: [] })] }],
          },
        }),
      ),
    ).toStrictEqual([
      {
        path: "$.pipelines.branches[0].pipeline[0].step.script",
        message: "script must contain at least one command",
      },
    ]);
  });
});

describe("raw", () => {
  it("refuses a document raw key that collides with a modelled key", () => {
    expect(pairsOf(withRaw({ image: "node:24" }))).toStrictEqual([
      { path: '$.raw["image"]', message: 'raw key "image" is already emitted at this level' },
    ]);
  });

  it("refuses a step raw key that collides with a modelled key", () => {
    expect(pairsOf(stepRaw({ script: ["echo no"] }))).toStrictEqual([
      {
        path: '$.pipelines.default[0].step.raw["script"]',
        message: 'raw key "script" is already emitted at this level',
      },
    ]);
  });

  it("refuses a raw block that is not a plain record", () => {
    const sequence = pipelineConfig({
      pipelines: { default: [step({ script: ["true"] })] },
      // @ts-expect-error raw is a record of keys to values, not an array
      raw: ["badge"],
    });

    expect(pairsOf(sequence)).toStrictEqual([
      { path: "$.raw", message: "raw must be a plain record of keys to values" },
    ]);
  });

  it("carries every problem in one throw", () => {
    const broken = pipelineConfig({
      pipelines: {
        default: [step({ script: [] })],
        branches: [
          { pattern: "", pipeline: [step({ script: ["true"] })] },
          { pattern: "main", pipeline: [] },
        ],
      },
    });

    expect(diagnosticsOf(broken)).toHaveLength(3);
  });
});
