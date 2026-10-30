import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type PipelineConfig, type StepItem, pipelineConfig, pipe, render, step } from "./index.js";

const oneStep = (): StepItem => step({ script: ["true"] });

/** A document with one default step, so a global section is the only variable under test. */
const withGlobal = (config: Omit<PipelineConfig, "pipelines">) =>
  parse(render(pipelineConfig({ ...config, pipelines: { default: [oneStep()] } }), { header: "" }));

describe("global sections", () => {
  it("emits clone, definitions, image and options in the document's alphabetical order", () => {
    const text = render(
      pipelineConfig({
        options: { docker: true },
        clone: { depth: 1 },
        definitions: { caches: { deps: "node_modules" } },
        image: "node:18-bullseye",
        pipelines: { default: [oneStep()] },
      }),
      { header: "" },
    );

    const topLevel = text
      .trimEnd()
      .split("\n")
      .filter((line) => !line.startsWith(" "));

    expect(topLevel.slice(0, 4)).toStrictEqual([
      "clone:",
      "definitions:",
      "image: node:18-bullseye",
      "options:",
    ]);
  });
});

describe("options", () => {
  it("emits docker, max-time, runs-on and size in the schema's order", () => {
    const parsed = withGlobal({
      options: { size: "2x", "runs-on": ["self.hosted", "linux"], "max-time": 30, docker: true },
    });

    expect(parsed.options).toStrictEqual({
      docker: true,
      "max-time": 30,
      "runs-on": ["self.hosted", "linux"],
      size: "2x",
    });
    expect(Object.keys(parsed.options)).toStrictEqual(["docker", "max-time", "runs-on", "size"]);
  });

  it("emits only the options that are set", () => {
    expect(withGlobal({ options: { docker: false } }).options).toStrictEqual({ docker: false });
  });
});

describe("clone", () => {
  it("keeps depth a number and emits the fields in order", () => {
    const parsed = withGlobal({
      clone: { "skip-ssl-verify": true, lfs: true, enabled: false, depth: 5 },
    });

    expect(parsed.clone).toStrictEqual({
      depth: 5,
      enabled: false,
      lfs: true,
      "skip-ssl-verify": true,
    });
    expect(Object.keys(parsed.clone)).toStrictEqual(["depth", "enabled", "lfs", "skip-ssl-verify"]);
  });

  it("keeps depth the string full", () => {
    const parsed = withGlobal({ clone: { depth: "full" } });

    expect(parsed.clone).toStrictEqual({ depth: "full" });
    expect(typeof parsed.clone.depth).toBe("string");
  });
});

describe("definitions.caches", () => {
  it("emits caches by name in author order, as a string or a path map with a files key", () => {
    const parsed = withGlobal({
      definitions: {
        caches: {
          composer: "vendor",
          npm: { path: "node_modules", key: { files: ["package-lock.json"] } },
        },
      },
    });

    expect(parsed.definitions.caches).toStrictEqual({
      composer: "vendor",
      npm: { path: "node_modules", key: { files: ["package-lock.json"] } },
    });
    expect(Object.keys(parsed.definitions.caches)).toStrictEqual(["composer", "npm"]);
    expect(Object.keys(parsed.definitions.caches.npm)).toStrictEqual(["path", "key"]);
  });
});

describe("definitions.services", () => {
  it("emits services with image, memory, type and variables in order", () => {
    const parsed = withGlobal({
      definitions: {
        services: {
          postgres: {
            variables: { POSTGRES_PASSWORD: "test" },
            type: "docker",
            memory: 512,
            image: "postgres:16",
          },
        },
      },
    });

    expect(parsed.definitions.services.postgres).toStrictEqual({
      image: "postgres:16",
      memory: 512,
      type: "docker",
      variables: { POSTGRES_PASSWORD: "test" },
    });
    expect(Object.keys(parsed.definitions.services.postgres)).toStrictEqual([
      "image",
      "memory",
      "type",
      "variables",
    ]);
  });
});

describe("definitions.steps", () => {
  it("emits a step group as the same step item a pipeline uses", () => {
    const parsed = withGlobal({
      definitions: {
        steps: [
          step({ name: "shared", script: ["npm ci", pipe({ pipe: "docker://example/pipe:1" })] }),
        ],
      },
    });

    expect(parsed.definitions.steps).toStrictEqual([
      { step: { name: "shared", script: ["npm ci", { pipe: "docker://example/pipe:1" }] } },
    ]);
    expect(Object.keys(parsed.definitions.steps[0])).toStrictEqual(["step"]);
  });
});

describe("selector sections", () => {
  it("emits default, branches, tags and pull-requests in order, quoting the patterns", () => {
    // The struct is written out of order on purpose: emission order is the spec's, not the author's.
    const text = render(
      pipelineConfig({
        pipelines: {
          "pull-requests": [{ pattern: "**", pipeline: [oneStep()] }],
          tags: [{ pattern: "*", pipeline: [oneStep()] }],
          branches: [{ pattern: "main", pipeline: [oneStep()] }],
          default: [oneStep()],
        },
      }),
      { header: "" },
    );

    const parsed = parse(text);

    expect(Object.keys(parsed.pipelines)).toStrictEqual([
      "default",
      "branches",
      "tags",
      "pull-requests",
    ]);
    expect(parsed.pipelines.tags).toStrictEqual({ "*": [{ step: { script: ["true"] } }] });
    expect(parsed.pipelines["pull-requests"]).toStrictEqual({
      "**": [{ step: { script: ["true"] } }],
    });
    expect(text).toContain('"*":');
    expect(text).toContain('"**":');
  });
});
