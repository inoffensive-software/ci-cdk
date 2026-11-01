import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { CHILD_PIPELINES } from "../../test/corpus/bitbucket-pipelines/child-pipelines.fixture.js";
import { type PipelineConfig, type Step, parallel, pipelineConfig, render, step } from "./index.js";

const diagnosticsOf = (config: PipelineConfig): readonly Diagnostic[] => {
  try {
    render(config);
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics;
    }

    throw error;
  }

  return [];
};

const pairsOf = (config: PipelineConfig): readonly { path: string; message: string }[] =>
  diagnosticsOf(config).map(({ path, message }) => ({ path, message }));

const child = (patch: Partial<Step> = {}): Step => ({
  custom: "a-child-pipeline",
  type: "pipeline",
  ...patch,
});

const withStep = (body: Step): PipelineConfig =>
  pipelineConfig({ pipelines: { default: [step(body)] } });

/** One forbidden property set on a child step, so each is refused by name at the step's path. */
const FORBIDDEN: readonly (readonly [string, Partial<Step>])[] = [
  ["caches", { caches: ["node"] }],
  ["clone", { clone: { depth: 1 } }],
  ["deployment", { deployment: "staging" }],
  ["image", { image: "node:24" }],
  ["oidc", { oidc: true }],
  ["runs-on", { "runs-on": ["self.hosted"] }],
  ["runtime", { runtime: { cloud: { arch: "arm" } } }],
  ["services", { services: ["database"] }],
  ["size", { size: "2x" }],
  ["trigger", { trigger: "manual" }],
];

const STEP_PATH = "$.pipelines.default[0].step";

describe("child pipeline step emission", () => {
  it("emits custom, input-variables, name and type in the schema's alphabetical order", () => {
    const text = render(
      withStep(
        child({
          name: "Child pipeline",
          "input-variables": { TARGET: "$BRANCH", ENVIRONMENT: "production" },
        }),
      ),
      { header: "" },
    );

    expect(Object.keys(parse(text).pipelines.default[0].step)).toStrictEqual([
      "custom",
      "input-variables",
      "name",
      "type",
    ]);
  });

  it("emits a child step without a script, and keeps the type beside the keys it forbids", () => {
    const text = render(withStep(child()), { header: "" });

    expect(text).toBe(
      [
        "pipelines:",
        "  default:",
        "    - step:",
        "        custom: a-child-pipeline",
        "        type: pipeline",
        "",
      ].join("\n"),
    );
    expect(text).not.toContain("script");
  });
});

describe("child pipeline input variables", () => {
  it("keeps the input-variables map in author order", () => {
    const parsed = parse(
      render(
        withStep(
          child({
            "input-variables": {
              var_2: "$SECOND",
              var_1: "$FIRST",
            },
          }),
        ),
        { header: "" },
      ),
    );

    expect(Object.keys(parsed.pipelines.default[0].step["input-variables"])).toStrictEqual([
      "var_2",
      "var_1",
    ]);
  });
});

describe("a child pipeline step's target", () => {
  it("refuses a child step with no custom pipeline", () => {
    expect(pairsOf(withStep({ type: "pipeline" }))).toStrictEqual([
      {
        path: `${STEP_PATH}.custom`,
        message: "a child pipeline step needs a non-empty custom pipeline name",
      },
    ]);
  });

  it("refuses an empty custom pipeline name", () => {
    expect(pairsOf(withStep(child({ custom: "" })))).toStrictEqual([
      {
        path: `${STEP_PATH}.custom`,
        message: "a child pipeline step needs a non-empty custom pipeline name",
      },
    ]);
  });
});

describe("a child pipeline step's forbidden properties", () => {
  it.each(FORBIDDEN)("refuses %s at the step path", (property, patch) => {
    expect(pairsOf(withStep(child(patch)))).toStrictEqual([
      {
        path: STEP_PATH,
        message: `a child pipeline step cannot set "${property}"`,
      },
    ]);
  });

  it("collects every forbidden property in one document", () => {
    const all: Partial<Step> = {};

    for (const [, patch] of FORBIDDEN) {
      Object.assign(all, patch);
    }

    expect(pairsOf(withStep(child(all))).map(({ message }) => message)).toStrictEqual(
      FORBIDDEN.map(([property]) => `a child pipeline step cannot set "${property}"`),
    );
  });

  it("refuses a forbidden property inside a parallel group and a stage", () => {
    const config = pipelineConfig({
      pipelines: {
        default: [
          parallel([step(child({ image: "node:24" }))]),
          { stage: { steps: [step(child({ services: ["database"] }))] } },
        ],
      },
    });

    expect(pairsOf(config)).toStrictEqual([
      {
        path: "$.pipelines.default[0].parallel[0].step",
        message: 'a child pipeline step cannot set "image"',
      },
      {
        path: "$.pipelines.default[1].stage.steps[0].step",
        message: 'a child pipeline step cannot set "services"',
      },
    ]);
  });
});

describe("script on the two step forms", () => {
  it("still refuses an inline step with no script", () => {
    expect(pairsOf(withStep({ name: "Build" }))).toStrictEqual([
      { path: `${STEP_PATH}.script`, message: "script must contain at least one command" },
    ]);
  });

  it("still refuses an inline step with an empty script", () => {
    expect(pairsOf(withStep({ script: [] }))).toStrictEqual([
      { path: `${STEP_PATH}.script`, message: "script must contain at least one command" },
    ]);
  });

  it("does not refuse a child step that carries a script", () => {
    expect(pairsOf(withStep(child({ script: ["echo child"] })))).toStrictEqual([]);
  });

  it("does not refuse a child step with no script", () => {
    expect(pairsOf(withStep(child()))).toStrictEqual([]);
  });
});

describe("child pipeline golden", () => {
  it("pins the documentation-derived document", async () => {
    await expect(render(CHILD_PIPELINES, { header: "" })).toMatchFileSnapshot(
      "__snapshots__/child-pipelines.yml",
    );
  });
});
