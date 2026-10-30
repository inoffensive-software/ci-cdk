import { describe, expect, it } from "vitest";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import {
  type PipelineConfig,
  finalStep,
  parallel,
  pipelineConfig,
  render,
  stage,
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

const testStep = () => step({ script: ["true"] });

describe("parallel groups", () => {
  it("refuses an empty sequence at the parallel key", () => {
    expect(pairsOf(pipelineConfig({ pipelines: { default: [parallel([])] } }))).toStrictEqual([
      {
        path: "$.pipelines.default[0].parallel",
        message: "parallel must contain at least one step",
      },
    ]);
  });

  it("refuses an empty map at the group key", () => {
    expect(
      pairsOf(pipelineConfig({ pipelines: { default: [parallel({ steps: [] })] } })),
    ).toStrictEqual([
      {
        path: "$.pipelines.default[0].parallel",
        message: "parallel must contain at least one step",
      },
    ]);
  });
});

describe("parallel steps", () => {
  it("validates an empty script", () => {
    expect(
      pairsOf(pipelineConfig({ pipelines: { default: [parallel([step({ script: [] })])] } })),
    ).toStrictEqual([
      {
        path: "$.pipelines.default[0].parallel[0].step.script",
        message: "script must contain at least one command",
      },
    ]);
  });

  it("validates a condition", () => {
    const bad = step({
      script: ["true"],
      // @ts-expect-error changesets requires includePaths or excludePaths
      condition: { changesets: {} },
    });

    expect(pairsOf(pipelineConfig({ pipelines: { default: [parallel([bad])] } }))).toStrictEqual([
      {
        path: "$.pipelines.default[0].parallel[0].step.condition.changesets",
        message: "changesets needs includePaths or excludePaths",
      },
    ]);
  });
});

describe("stage steps", () => {
  it("refuses a stage with no steps", () => {
    expect(
      pairsOf(pipelineConfig({ pipelines: { default: [stage({ name: "Empty", steps: [] })] } })),
    ).toStrictEqual([
      {
        path: "$.pipelines.default[0].stage.steps",
        message: "stage must contain at least one step",
      },
    ]);
  });

  it("validates the steps inside a stage", () => {
    const config = pipelineConfig({
      pipelines: {
        branches: [
          {
            pattern: "main",
            pipeline: [stage({ name: "Deploy", steps: [step({ script: [] })] })],
          },
        ],
      },
    });

    expect(pairsOf(config)).toStrictEqual([
      {
        path: "$.pipelines.branches[0].pipeline[0].stage.steps[0].step.script",
        message: "script must contain at least one command",
      },
    ]);
  });
});

describe("stage raw", () => {
  it("refuses a key that collides with a modelled stage key", () => {
    const config = pipelineConfig({
      pipelines: {
        default: [stage({ name: "Deploy", steps: [testStep()], raw: { name: "x" } })],
      },
    });

    expect(pairsOf(config)).toStrictEqual([
      {
        path: '$.pipelines.default[0].stage.raw["name"]',
        message: 'raw key "name" is already emitted at this level',
      },
    ]);
  });
});

describe("final position", () => {
  it("refuses a final step that is not last", () => {
    const config = pipelineConfig({
      pipelines: { default: [testStep(), finalStep({ script: ["clean"] }), testStep()] },
    });

    expect(pairsOf(config)).toStrictEqual([
      { path: "$.pipelines.default[1]", message: "the final step must be the last item" },
    ]);
  });

  it("refuses a final step as the only item", () => {
    const config = pipelineConfig({ pipelines: { default: [finalStep({ script: ["clean"] })] } });

    expect(pairsOf(config)).toStrictEqual([
      {
        path: "$.pipelines.default[0]",
        message: "the final step needs at least one step before it",
      },
    ]);
  });

  it("refuses more than one final step", () => {
    const config = pipelineConfig({
      pipelines: {
        default: [testStep(), finalStep({ script: ["clean"] }), finalStep({ script: ["again"] })],
      },
    });

    expect(pairsOf(config)).toStrictEqual([
      { path: "$.pipelines.default[1]", message: "the final step must be the last item" },
      { path: "$.pipelines.default[2]", message: "a pipeline allows one final step" },
    ]);
  });
});

describe("final body", () => {
  it("validates the script at the final key", () => {
    const config = pipelineConfig({
      pipelines: { default: [testStep(), finalStep({ script: [] })] },
    });

    expect(pairsOf(config)).toStrictEqual([
      {
        path: "$.pipelines.default[1].final.script",
        message: "script must contain at least one command",
      },
    ]);
  });
});

describe("custom names", () => {
  it("refuses an empty name", () => {
    const config = pipelineConfig({
      pipelines: { custom: [{ name: "", pipeline: [testStep()] }] },
    });

    expect(pairsOf(config)).toStrictEqual([
      { path: "$.pipelines.custom[0].name", message: "custom pipeline name must not be empty" },
    ]);
  });

  it("refuses a duplicate name at the later entry", () => {
    const config = pipelineConfig({
      pipelines: {
        custom: [
          { name: "deploy", pipeline: [testStep()] },
          { name: "deploy", pipeline: [testStep()] },
        ],
      },
    });

    expect(pairsOf(config)).toStrictEqual([
      {
        path: "$.pipelines.custom[1].name",
        message: 'duplicate custom pipeline "deploy": two pipelines share one name',
      },
    ]);
  });
});

describe("custom pipelines", () => {
  it("refuses a pipeline with no items", () => {
    const config = pipelineConfig({ pipelines: { custom: [{ name: "deploy", pipeline: [] }] } });

    expect(pairsOf(config)).toStrictEqual([
      {
        path: "$.pipelines.custom[0].pipeline",
        message: "pipeline must contain at least one item",
      },
    ]);
  });

  it("validates a step inside a stage inside a custom pipeline", () => {
    const config = pipelineConfig({
      pipelines: {
        custom: [
          { name: "deploy", pipeline: [stage({ name: "S", steps: [step({ script: [] })] })] },
        ],
      },
    });

    expect(pairsOf(config)).toStrictEqual([
      {
        path: "$.pipelines.custom[0].pipeline[0].stage.steps[0].step.script",
        message: "script must contain at least one command",
      },
    ]);
  });
});
