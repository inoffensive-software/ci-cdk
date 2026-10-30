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
        ref: "release/1.5",
        inputs: { VERSION: "1.5", SHARDS: 4 },
      },
    });

    expect(parsed["trigger"]).toStrictEqual({
      project: "${DOWNSTREAM_PROJECT}",
      ref: "release/1.5",
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
});

describe("job trigger: absent", () => {
  it("emits nothing", () => {
    expect(body({ script: "true" })).toStrictEqual({ script: "true" });
  });
});
