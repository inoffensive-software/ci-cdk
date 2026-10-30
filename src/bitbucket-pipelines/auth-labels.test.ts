import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { type PipelineConfig, type Step, pipelineConfig, render, step } from "./index.js";

interface ParsedAuth {
  readonly system?: { readonly scopes?: readonly string[] };
}

interface ParsedStepBody {
  readonly auth?: ParsedAuth;
  readonly script?: readonly string[];
}

interface ParsedDocument {
  readonly labels?: Readonly<Record<string, string>>;
  readonly pipelines: {
    readonly default: readonly { readonly step: ParsedStepBody }[];
  };
}

const withStep = (body: Step): PipelineConfig =>
  pipelineConfig({ pipelines: { default: [step(body)] } });

const parsed = (config: PipelineConfig): ParsedDocument => parse(render(config, { header: "" }));

const stepOf = (config: PipelineConfig): ParsedStepBody => {
  const first = parsed(config).pipelines.default[0];

  if (first === undefined) {
    throw new TypeError("expected a step");
  }

  return first.step;
};

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

describe("step auth", () => {
  it("emits system then scopes between artifacts and caches", () => {
    const config = withStep({
      artifacts: ["dist/**"],
      auth: { system: { scopes: ["repository:write", "deployment:write"] } },
      caches: ["node-modules"],
      script: ["true"],
    });

    expect(render(config, { header: "" })).toContain(
      [
        "        artifacts:",
        "          - dist/**",
        "        auth:",
        "          system:",
        "            scopes:",
        "              - repository:write",
        "              - deployment:write",
        "        caches:",
        "          - node-modules",
      ].join("\n"),
    );
    expect(Object.keys(stepOf(config))).toStrictEqual(["artifacts", "auth", "caches", "script"]);
  });

  it("emits only the layers the author set", () => {
    expect(Object.keys(stepOf(withStep({ auth: { system: {} }, script: ["true"] })))).toStrictEqual(
      ["auth", "script"],
    );
    expect(stepOf(withStep({ auth: {}, script: ["true"] })).auth).toStrictEqual({});
  });

  it("does not emit auth when the author leaves it absent", () => {
    expect(stepOf(withStep({ script: ["true"] }))).toStrictEqual({ script: ["true"] });
  });
});

describe("pipeline labels", () => {
  it("emits labels after image and before options, in author order", () => {
    const config = pipelineConfig({
      image: "node:24",
      labels: { team: "platform", tier: "backend" },
      options: { docker: true },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(Object.keys(parsed(config))).toStrictEqual(["image", "labels", "options", "pipelines"]);
    expect(parsed(config).labels).toStrictEqual({ team: "platform", tier: "backend" });
  });

  it("does not emit labels when the author leaves them absent", () => {
    const config = pipelineConfig({ pipelines: { default: [step({ script: ["true"] })] } });

    expect(parsed(config)).not.toHaveProperty("labels");
  });
});

describe("schema-derived validation", () => {
  it("refuses an empty scope list at the scopes path", () => {
    const config = withStep({ auth: { system: { scopes: [] } }, script: ["true"] });

    expect(diagnosticsOf(config).map(({ path, message }) => ({ path, message }))).toStrictEqual([
      {
        path: "$.pipelines.default[0].step.auth.system.scopes",
        message: "step auth needs at least one scope",
      },
    ]);
  });

  it("refuses an empty label key at its path", () => {
    const config = pipelineConfig({
      labels: { "": "value" },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(diagnosticsOf(config).map(({ path, message }) => ({ path, message }))).toStrictEqual([
      {
        path: '$.labels[""]',
        message: "label key must not be empty",
      },
    ]);
  });
});
