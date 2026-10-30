import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { ALIGENT_GRAPHQL_MESH } from "../../test/corpus/bitbucket-pipelines/aligent-graphql-mesh.fixture.js";
import { ARTIFACTS_EXPANDED } from "../../test/corpus/bitbucket-pipelines/artifacts-expanded.fixture.js";
import { CONNECT_EXPRESS } from "../../test/corpus/bitbucket-pipelines/connect-express.fixture.js";
import { OBUSPA } from "../../test/corpus/bitbucket-pipelines/obuspa.fixture.js";
import { RAIR_DAPP } from "../../test/corpus/bitbucket-pipelines/rair-dapp.fixture.js";
import { SYSTEMSDK_SYMFONY } from "../../test/corpus/bitbucket-pipelines/systemsdk-symfony.fixture.js";
import * as provider from "./index.js";
import { type PipelineConfig, pipelineConfig, pipe, render, step } from "./index.js";

const oneStep = (): PipelineConfig =>
  pipelineConfig({
    pipelines: { default: [step({ script: ["npm ci", "npm test"] })] },
  });

describe("render", () => {
  it("pins the connect-express fixture with the header suppressed", async () => {
    await expect(render(CONNECT_EXPRESS, { header: "" })).toMatchFileSnapshot(
      "__snapshots__/connect-express.yml",
    );
  });

  it("pins the aligent-graphql-mesh fixture with the header suppressed", async () => {
    await expect(render(ALIGENT_GRAPHQL_MESH, { header: "" })).toMatchFileSnapshot(
      "__snapshots__/aligent-graphql-mesh.yml",
    );
  });

  it("pins the systemsdk-symfony fixture with the header suppressed", async () => {
    await expect(render(SYSTEMSDK_SYMFONY, { header: "" })).toMatchFileSnapshot(
      "__snapshots__/systemsdk-symfony.yml",
    );
  });

  it("pins the obuspa fixture with the header suppressed", async () => {
    await expect(render(OBUSPA, { header: "" })).toMatchFileSnapshot("__snapshots__/obuspa.yml");
  });

  it("pins the rair-dapp fixture with the header suppressed", async () => {
    await expect(render(RAIR_DAPP, { header: "" })).toMatchFileSnapshot(
      "__snapshots__/rair-dapp.yml",
    );
  });

  it("pins the artifacts-expanded fixture with the header suppressed", async () => {
    await expect(render(ARTIFACTS_EXPANDED, { header: "" })).toMatchFileSnapshot(
      "__snapshots__/artifacts-expanded.yml",
    );
  });

  it("emits image first, then pipelines", () => {
    const text = render(
      pipelineConfig({
        image: "node:18-bullseye",
        pipelines: { default: [step({ script: ["true"] })] },
      }),
      { header: "" },
    );

    expect(text.indexOf("image:")).toBeLessThan(text.indexOf("pipelines:"));
  });
});

describe("pipelines", () => {
  it("emits default items in array order and branches as pattern maps in array order", () => {
    const text = render(
      pipelineConfig({
        pipelines: {
          default: [
            step({ name: "first", script: ["one"] }),
            step({ name: "second", script: ["two"] }),
          ],
          branches: [
            { pattern: "main", pipeline: [step({ script: ["main"] })] },
            { pattern: "release/*", pipeline: [step({ script: ["release"] })] },
          ],
        },
      }),
      { header: "" },
    );

    const parsed = parse(text);

    expect(parsed).toStrictEqual({
      pipelines: {
        default: [
          { step: { name: "first", script: ["one"] } },
          { step: { name: "second", script: ["two"] } },
        ],
        branches: {
          main: [{ step: { script: ["main"] } }],
          "release/*": [{ step: { script: ["release"] } }],
        },
      },
    });
    expect(Object.keys(parsed.pipelines.branches)).toStrictEqual(["main", "release/*"]);
  });
});

describe("steps", () => {
  it("emits a step's name, oidc and script in that order and omits absent fields", () => {
    const text = render(
      pipelineConfig({
        pipelines: {
          default: [
            step({ oidc: true, name: "publish", script: ["npm publish"] }),
            step({ script: ["true"] }),
          ],
        },
      }),
      { header: "" },
    );

    const parsed = parse(text);

    expect(parsed).toStrictEqual({
      pipelines: {
        default: [
          { step: { name: "publish", oidc: true, script: ["npm publish"] } },
          { step: { script: ["true"] } },
        ],
      },
    });
    expect(Object.keys(parsed.pipelines.default[0].step)).toStrictEqual(["name", "oidc", "script"]);
    expect(Object.keys(parsed.pipelines.default[1].step)).toStrictEqual(["script"]);
  });
});

describe("pipes", () => {
  it("emits a pipe inside a script sequence with its variables map beneath it", () => {
    const text = render(
      pipelineConfig({
        pipelines: {
          default: [
            step({
              script: [
                "npm ci",
                pipe({
                  pipe: "atlassian/default-image:4",
                  variables: { NAME: "value", LIST: ["one", "two"] },
                }),
              ],
            }),
          ],
        },
      }),
      { header: "" },
    );

    expect(parse(text)).toStrictEqual({
      pipelines: {
        default: [
          {
            step: {
              script: [
                "npm ci",
                {
                  pipe: "atlassian/default-image:4",
                  variables: { NAME: "value", LIST: ["one", "two"] },
                },
              ],
            },
          },
        ],
      },
    });
  });
});

describe("options", () => {
  it("suppresses the header on request and keeps the default header unchanged", () => {
    const headed = render(oneStep());

    expect(render(oneStep(), { header: "" }).startsWith("pipelines:\n")).toBe(true);
    expect(
      headed.startsWith("# Generated by @inoffensive/ci-cdk. Do not edit.\npipelines:\n"),
    ).toBe(true);
  });

  it("is deterministic across two renders of the same struct", () => {
    expect(render(oneStep())).toBe(render(oneStep()));
  });
});

describe("builders", () => {
  it("returns their input, wrapping a step exactly once", () => {
    const built = step({ script: ["true"] });
    const config = pipelineConfig({ pipelines: { default: [built] } });
    const builtPipe = pipe({ pipe: "docker://example/pipe:1" });

    expect(step({ script: ["true"] })).toStrictEqual({ step: { script: ["true"] } });
    expect(pipelineConfig(config)).toBe(config);
    expect(pipe(builtPipe)).toBe(builtPipe);
  });
});

describe("barrel", () => {
  it("exposes exactly the two functions, the five builders and the struct types", () => {
    expect(Object.keys(provider).toSorted()).toStrictEqual([
      "finalStep",
      "parallel",
      "pipe",
      "pipelineConfig",
      "render",
      "stage",
      "step",
      "toDoc",
    ]);
  });
});
