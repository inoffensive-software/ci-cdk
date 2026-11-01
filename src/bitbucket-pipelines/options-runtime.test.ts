import { describe, expect, it } from "vitest";

import { pipelineConfig, step } from "./index.js";
import { parsed } from "./runtime-test-support.js";

describe("options runtime", () => {
  it("emits docker, max-time, runs-on, runtime then size", () => {
    const config = pipelineConfig({
      options: {
        docker: true,
        "max-time": 120,
        "runs-on": ["self.hosted"],
        runtime: { cloud: { platform: "linux" } },
        size: "4x",
      },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(Object.keys(parsed(config).options ?? {})).toStrictEqual([
      "docker",
      "max-time",
      "runs-on",
      "runtime",
      "size",
    ]);
  });

  it("does not emit runtime when the author leaves it absent", () => {
    const config = pipelineConfig({
      options: { docker: true },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(parsed(config).options).toStrictEqual({ docker: true });
  });

  it("carries a self-hosted runtime on options", () => {
    const config = pipelineConfig({
      options: { runtime: { "self-hosted": { cpu: 2, memory: 4096, volumes: ["/tmp:/tmp"] } } },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(parsed(config).options?.runtime).toStrictEqual({
      "self-hosted": { cpu: 2, memory: 4096, volumes: ["/tmp:/tmp"] },
    });
  });
});
