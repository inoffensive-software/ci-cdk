import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { type TriggerConfig, type Triggers, pipelineConfig, render, step } from "./index.js";

const configWith = (triggers: Triggers): ReturnType<typeof pipelineConfig> =>
  pipelineConfig({
    pipelines: { default: [step({ script: ["true"] })] },
    triggers,
  });

const diagnosticsOf = (triggers: Triggers): readonly Diagnostic[] => {
  try {
    render(configWith(triggers));
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics;
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

const ENTRY: TriggerConfig = {
  condition: 'BITBUCKET_BRANCH == "main"',
  pipelines: ["build", "deploy"],
};

const EXPECTED_EMISSION = [
  "pipelines:",
  "  default:",
  "    - step:",
  "        script:",
  '          - "true"',
  "triggers:",
  "  pullrequest-push:",
  '    - condition: BITBUCKET_BRANCH == "main"',
  "      pipelines:",
  "        - build",
  "        - deploy",
  '    - condition: glob(BITBUCKET_BRANCH, "feature/*")',
  "      pipelines:",
  "        - build",
  "  repository-push:",
  '    - condition: "true"',
  "      pipelines:",
  "        - deploy",
  "",
].join("\n");

describe("triggers emission", () => {
  it("emits each trigger type in author order with condition before pipelines", () => {
    const text = render(
      configWith({
        "pullrequest-push": [
          ENTRY,
          { condition: 'glob(BITBUCKET_BRANCH, "feature/*")', pipelines: ["build"] },
        ],
        "repository-push": [{ condition: "true", pipelines: ["deploy"] }],
      }),
      { header: "" },
    );

    expect(text).toBe(EXPECTED_EMISSION);
  });

  it("places triggers after pipelines and before raw", () => {
    const text = render(
      pipelineConfig({
        pipelines: { default: [step({ script: ["true"] })] },
        triggers: { "repository-push": [ENTRY] },
        raw: { "x-custom": true },
      }),
      { header: "" },
    );

    expect(Object.keys(parse(text))).toStrictEqual(["pipelines", "triggers", "x-custom"]);
  });

  it("parses back to the data it was built from", () => {
    const triggers: Triggers = {
      "pullrequest-push": [ENTRY],
      "repository-push": [{ condition: "true", pipelines: ["deploy"] }],
    };

    expect(parse(render(configWith(triggers), { header: "" })).triggers).toStrictEqual(triggers);
  });

  it("omits the key when no trigger is declared", () => {
    const text = render(pipelineConfig({ pipelines: { default: [step({ script: ["true"] })] } }), {
      header: "",
    });

    expect(text).not.toContain("triggers");
  });
});

describe("triggers validation", () => {
  it("refuses an empty trigger list at the trigger type's path", () => {
    expect(diagnosticsOf({ "repository-push": [] })).toStrictEqual([
      {
        path: '$.triggers["repository-push"]',
        message: "trigger type must declare at least one entry",
      },
    ]);
  });

  it("refuses an empty condition at the entry's condition path", () => {
    expect(
      diagnosticsOf({ "repository-push": [{ condition: "", pipelines: ["build"] }] }),
    ).toStrictEqual([
      {
        path: '$.triggers["repository-push"][0].condition',
        message: "a trigger needs a non-empty condition",
      },
    ]);
  });

  it("refuses an entry with no pipeline names at the entry's pipelines path", () => {
    expect(
      diagnosticsOf({ "repository-push": [{ condition: "true", pipelines: [] }] }),
    ).toStrictEqual([
      {
        path: '$.triggers["repository-push"][0].pipelines',
        message: "a trigger needs at least one pipeline name",
      },
    ]);
  });

  it("reports every offending entry, not just the first", () => {
    const diagnostics = diagnosticsOf({
      "repository-push": [ENTRY, { condition: "", pipelines: [] }],
    });

    expect(diagnostics.map((diagnostic) => diagnostic.path)).toStrictEqual([
      '$.triggers["repository-push"][1].condition',
      '$.triggers["repository-push"][1].pipelines',
    ]);
  });
});
