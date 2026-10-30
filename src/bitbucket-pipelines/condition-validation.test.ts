import { describe, expect, it } from "vitest";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { type Condition, type PipelineConfig, pipelineConfig, render, step } from "./index.js";

const pairsOf = (config: PipelineConfig): readonly { path: string; message: string }[] => {
  try {
    render(config);
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics.map(({ path, message }: Diagnostic) => ({ path, message }));
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

const withCondition = (condition: Condition): PipelineConfig =>
  pipelineConfig({ pipelines: { default: [step({ script: ["true"], condition })] } });

describe("condition.changesets refusals", () => {
  it("refuses changesets with neither list", () => {
    // @ts-expect-error changesets requires exactly one of includePaths or excludePaths
    const empty: Condition = { changesets: {} };

    expect(pairsOf(withCondition(empty))).toStrictEqual([
      {
        path: "$.pipelines.default[0].step.condition.changesets",
        message: "changesets needs includePaths or excludePaths",
      },
    ]);
  });

  it("refuses changesets with both lists", () => {
    // @ts-expect-error changesets takes one list, not both
    const both: Condition = { changesets: { includePaths: ["src/**"], excludePaths: ["docs/**"] } };

    expect(pairsOf(withCondition(both))).toStrictEqual([
      {
        path: "$.pipelines.default[0].step.condition.changesets",
        message: "changesets takes includePaths or excludePaths, not both",
      },
    ]);
  });
});

describe("condition.changesets acceptance", () => {
  it("accepts includePaths alone and excludePaths alone", () => {
    expect(() => render(withCondition({ changesets: { includePaths: ["src/**"] } }))).not.toThrow();
    expect(() =>
      render(withCondition({ changesets: { excludePaths: ["docs/**"] } })),
    ).not.toThrow();
  });

  it("walks through a selector pipeline and a shared definition", () => {
    // @ts-expect-error changesets requires exactly one of includePaths or excludePaths
    const broken: Condition = { changesets: {} };

    expect(
      pairsOf(
        pipelineConfig({
          definitions: { steps: [step({ script: ["true"], condition: broken })] },
          pipelines: {
            branches: [
              { pattern: "main", pipeline: [step({ script: ["true"], condition: broken })] },
            ],
          },
        }),
      ),
    ).toStrictEqual([
      {
        path: "$.definitions.steps[0].step.condition.changesets",
        message: "changesets needs includePaths or excludePaths",
      },
      {
        path: "$.pipelines.branches[0].pipeline[0].step.condition.changesets",
        message: "changesets needs includePaths or excludePaths",
      },
    ]);
  });
});
