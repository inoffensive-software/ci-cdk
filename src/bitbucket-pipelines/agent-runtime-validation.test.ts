import { describe, expect, it } from "vitest";

import { pipelineConfig, render, step } from "./index.js";

const scriptTask = (agent: string): ReturnType<typeof render> => {
  const config = pipelineConfig({
    pipelines: {
      default: [
        step({
          script: ["npm ci", { agent }],
        }),
      ],
    },
  });

  return render(config, { header: "" });
};

describe("agent definition validation", () => {
  it("refuses an agent definition with an empty prompt at its path", () => {
    const config = pipelineConfig({
      definitions: { agents: { helper: { prompt: "" } } },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(() => render(config, { header: "" })).toThrow(
      "$.definitions.agents.helper.prompt: an agent definition needs a non-empty prompt",
    );
  });

  it("refuses an agent definition whose author-chosen name is empty", () => {
    const config = pipelineConfig({
      definitions: { agents: { "": { prompt: "Review the diff." } } },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(() => render(config, { header: "" })).toThrow(
      '$.definitions.agents[""]: definition name must not be empty',
    );
  });
});

describe("agent task validation", () => {
  it("refuses an agent task with an empty agent name at its script-item path", () => {
    expect(() => scriptTask("")).toThrow(
      "$.pipelines.default[0].step.script[1].agent: an agent task needs a non-empty agent name",
    );
  });

  it("does not require an agent task to resolve the definition it names", () => {
    const config = pipelineConfig({
      pipelines: { default: [step({ script: [{ agent: "not-declared-anywhere" }] })] },
    });

    expect(render(config, { header: "" })).toContain("- agent: not-declared-anywhere");
  });
});
