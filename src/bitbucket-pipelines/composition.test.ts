import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import type { StageItem } from "./index.js";
import { finalStep, parallel, pipelineConfig, pipe, render, stage, step } from "./index.js";

const oneStep = (script: string) => step({ script: [script] });

/**
 * A stage step has no condition of its own: the stage carries it. The directive keeps compiling this
 * document, which only exists to prove the type rejects it.
 */
const stageStepWithCondition = (): StageItem =>
  // @ts-expect-error a stage carries the condition; a step inside it cannot have one
  stage({ steps: [{ step: { script: ["deploy"], condition: { state: "successful" } } }] });

describe("parallel sequence", () => {
  it("emits the sequence form as a bare list of step items", () => {
    const text = render(
      pipelineConfig({
        pipelines: {
          default: [
            parallel([
              step({ name: "one", script: ["one"] }),
              step({ name: "two", script: ["two"] }),
            ]),
          ],
        },
      }),
      { header: "" },
    );

    expect(parse(text)).toStrictEqual({
      pipelines: {
        default: [
          {
            parallel: [
              { step: { name: "one", script: ["one"] } },
              { step: { name: "two", script: ["two"] } },
            ],
          },
        ],
      },
    });
  });
});

describe("parallel map", () => {
  it("emits the map form as fail-fast then steps", () => {
    const text = render(
      pipelineConfig({
        pipelines: {
          default: [parallel({ "fail-fast": true, steps: [oneStep("one"), oneStep("two")] })],
        },
      }),
      { header: "" },
    );

    const parsed = parse(text);

    expect(parsed.pipelines.default[0]).toStrictEqual({
      parallel: {
        "fail-fast": true,
        steps: [{ step: { script: ["one"] } }, { step: { script: ["two"] } }],
      },
    });
    expect(Object.keys(parsed.pipelines.default[0].parallel)).toStrictEqual(["fail-fast", "steps"]);
  });
});

describe("stage shape", () => {
  it("emits one stage map whose nested sequence is steps", () => {
    const text = render(
      pipelineConfig({
        pipelines: {
          branches: [
            {
              pattern: "main",
              pipeline: [
                stage({
                  name: "Deploy",
                  deployment: "production",
                  steps: [oneStep("deploy")],
                }),
              ],
            },
          ],
        },
      }),
      { header: "" },
    );

    expect(parse(text)).toStrictEqual({
      pipelines: {
        branches: {
          main: [
            {
              stage: {
                name: "Deploy",
                deployment: "production",
                steps: [{ step: { script: ["deploy"] } }],
              },
            },
          ],
        },
      },
    });
  });
});

describe("stage step condition", () => {
  it("does not let a step inside a stage carry a condition", () => {
    expect(stageStepWithCondition().stage.steps).toHaveLength(1);
  });
});

describe("stage order", () => {
  it("emits condition, deployment, environment, name, steps, trigger then raw", () => {
    const text = render(
      pipelineConfig({
        pipelines: {
          default: [
            stage({
              trigger: "manual",
              name: "Release",
              steps: [oneStep("release")],
              raw: { custom: "value" },
              environment: "staging",
              deployment: "staging",
              condition: { state: "SUCCESSFUL" },
            }),
          ],
        },
      }),
      { header: "" },
    );

    const parsed = parse(text);
    const built = parsed.pipelines.default[0].stage;

    expect(Object.keys(built)).toStrictEqual([
      "condition",
      "deployment",
      "environment",
      "name",
      "steps",
      "trigger",
      "custom",
    ]);
    expect(built.condition).toStrictEqual({ state: "SUCCESSFUL" });
    expect(built.trigger).toBe("manual");
  });
});

describe("final", () => {
  it("emits a final item after the steps it cleans up", () => {
    const text = render(
      pipelineConfig({
        pipelines: {
          default: [
            oneStep("test"),
            finalStep({ name: "Clean up", script: ["rm -rf dist"], trigger: "automatic" }),
          ],
        },
      }),
      { header: "" },
    );

    expect(parse(text)).toStrictEqual({
      pipelines: {
        default: [
          { step: { script: ["test"] } },
          { final: { name: "Clean up", script: ["rm -rf dist"], trigger: "automatic" } },
        ],
      },
    });
  });

  it("accepts a pipe in a final step's script", () => {
    const text = render(
      pipelineConfig({
        pipelines: {
          default: [oneStep("test"), finalStep({ script: [pipe({ pipe: "docker://clean:1" })] })],
        },
      }),
      { header: "" },
    );

    expect(parse(text).pipelines.default[1]).toStrictEqual({
      final: { script: [{ pipe: "docker://clean:1" }] },
    });
  });
});

describe("custom pipelines", () => {
  it("emits custom entries in array order, keyed by name", () => {
    const text = render(
      pipelineConfig({
        pipelines: {
          default: [oneStep("default")],
          custom: [
            { name: "deploy", pipeline: [oneStep("deploy")] },
            { name: "rollback", pipeline: [stage({ name: "Undo", steps: [oneStep("undo")] })] },
          ],
        },
      }),
      { header: "" },
    );

    const parsed = parse(text);

    expect(Object.keys(parsed.pipelines)).toStrictEqual(["default", "custom"]);
    expect(Object.keys(parsed.pipelines.custom)).toStrictEqual(["deploy", "rollback"]);
    expect(parsed.pipelines.custom.rollback).toStrictEqual([
      { stage: { name: "Undo", steps: [{ step: { script: ["undo"] } }] } },
    ]);
  });
});

describe("composition in every section", () => {
  it("accepts parallel and stage items inside tags, pull-requests and custom", () => {
    const text = render(
      pipelineConfig({
        pipelines: {
          tags: [{ pattern: "*", pipeline: [parallel([oneStep("tag")])] }],
          "pull-requests": [
            { pattern: "**", pipeline: [stage({ name: "Check", steps: [oneStep("pr")] })] },
          ],
          custom: [{ name: "manual", pipeline: [oneStep("manual")] }],
        },
      }),
      { header: "" },
    );

    const parsed = parse(text);

    expect(parsed.pipelines.tags["*"][0]).toStrictEqual({
      parallel: [{ step: { script: ["tag"] } }],
    });
    expect(parsed.pipelines["pull-requests"]["**"][0].stage.steps).toStrictEqual([
      { step: { script: ["pr"] } },
    ]);
    expect(parsed.pipelines.custom.manual).toStrictEqual([{ step: { script: ["manual"] } }]);
  });
});
