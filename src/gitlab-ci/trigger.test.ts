import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import type { Value } from "../core/index.js";
import { type Job, type Pipeline, job, pipeline, render } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

/** One job, so each field reads as the body it produces rather than as a whole document. */
const body = (fields: Omit<Job, "name">): Readonly<Record<string, Value>> =>
  parse(bare(pipeline({ jobs: [job({ name: "deploy", ...fields })] }))).deploy;

describe("job trigger: multi-project", () => {
  it("writes a bare string as a scalar, the child pipeline path it names", () => {
    expect(body({ trigger: "child/pipeline.yml" })["trigger"]).toBe("child/pipeline.yml");
  });

  it("writes a multi-project trigger's keys in order and omits the absent ones", () => {
    const trigger = {
      project: "group/downstream",
      branch: "main",
      strategy: "depend",
      inputs: { DEPLOY_ENV: "staging", RETRIES: 2 },
    } as const;

    expect(body({ trigger })["trigger"]).toStrictEqual(trigger);
    expect(body({ trigger: { project: "group/downstream" } })["trigger"]).toStrictEqual({
      project: "group/downstream",
    });
  });

  it("keeps a project path and its inputs as written, resolving nothing", () => {
    const parsed = body({
      trigger: {
        project: "${DOWNSTREAM_PROJECT}",
        branch: "release/1.5",
        inputs: { VERSION: "1.5", SHARDS: 4 },
      },
    });

    expect(parsed["trigger"]).toStrictEqual({
      project: "${DOWNSTREAM_PROJECT}",
      branch: "release/1.5",
      inputs: { VERSION: "1.5", SHARDS: 4 },
    });
  });
});

describe("job trigger: child pipeline", () => {
  it("writes the include as one entry or a sequence", () => {
    expect(
      body({ trigger: { include: { local: ".gitlab/ci/child.yml" }, strategy: "mirror" } })[
        "trigger"
      ],
    ).toStrictEqual({ include: { local: ".gitlab/ci/child.yml" }, strategy: "mirror" });

    expect(
      body({ trigger: { include: [{ template: "Child.yml" }, { local: "ci/child.yml" }] } })[
        "trigger"
      ],
    ).toStrictEqual({ include: [{ template: "Child.yml" }, { local: "ci/child.yml" }] });
  });

  it("writes one path as a scalar", () => {
    expect(body({ trigger: { include: "ci/child.yml" } })["trigger"]).toStrictEqual({
      include: "ci/child.yml",
    });
  });

  it("writes an artifact include with its job", () => {
    const trigger = {
      include: { artifact: "generated/child.yml", job: "generate" },
    } as const;

    expect(body({ trigger })["trigger"]).toStrictEqual(trigger);
  });

  it("accepts inputs on every child include shape, in author order", () => {
    const include = [
      { local: "ci/local.yml", inputs: { env: "a" } },
      { template: "Child.yml", inputs: { env: { value: "b", expand: false } } },
      {
        artifact: "child.yml",
        job: "generate",
        inputs: { env: ["c", "d"], rows: [{ value: "c" }, [1, 2]] },
      },
      { project: "group/project", ref: "main", file: "ci.yml", inputs: { env: 1 } },
      { component: "gitlab.com/components/child@1.0", inputs: { zulu: "z", alpha: "a" } },
      { remote: "https://example.com/child.yml", inputs: { env: true } },
    ] as const;

    const text = bare(pipeline({ jobs: [job({ name: "deploy", trigger: { include } })] }));

    expect(body({ trigger: { include } })["trigger"]).toStrictEqual({ include });
    expect(text.indexOf("zulu:")).toBeLessThan(text.indexOf("alpha:"));
  });
});

describe("job trigger: forward and inputs", () => {
  it("writes forward after a multi-project trigger's inputs", () => {
    const trigger = {
      project: "group/downstream",
      inputs: { TARGET: { value: "production", description: "target" } },
      forward: { pipeline_variables: true, yaml_variables: false },
    } as const;

    const text = bare(pipeline({ jobs: [job({ name: "deploy", trigger })] }));

    expect(body({ trigger })["trigger"]).toStrictEqual(trigger);
    expect(text.indexOf("inputs:")).toBeLessThan(text.indexOf("forward:"));
    expect(text.indexOf("yaml_variables:")).toBeLessThan(text.indexOf("pipeline_variables:"));
  });

  it("writes forward on a child trigger after the strategy", () => {
    expect(
      body({
        trigger: {
          include: "ci/child.yml",
          strategy: "depend",
          forward: { yaml_variables: true },
        },
      })["trigger"],
    ).toStrictEqual({
      include: "ci/child.yml",
      strategy: "depend",
      forward: { yaml_variables: true },
    });
  });

  it("emits no forward key when the trigger omits it", () => {
    expect(body({ trigger: { project: "group/downstream" } })["trigger"]).toStrictEqual({
      project: "group/downstream",
    });
    expect(body({ trigger: { include: "ci/child.yml" } })["trigger"]).toStrictEqual({
      include: "ci/child.yml",
    });
  });

  it("accepts nested input lists on a multi-project trigger", () => {
    const trigger = {
      project: "group/downstream",
      inputs: { grid: [[{ value: "a" }], [{ value: "b" }]] },
    } as const;

    expect(body({ trigger })["trigger"]).toStrictEqual(trigger);
  });
});

describe("job trigger: absent", () => {
  it("emits nothing", () => {
    expect(body({ script: "true" })).toStrictEqual({ script: "true" });
  });
});
