import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  type Condition,
  type PipelineConfig,
  type Step,
  pipelineConfig,
  pipe,
  render,
  step,
} from "./index.js";

interface ParsedImage {
  readonly name?: string;
  readonly password?: string;
  readonly username?: string;
}

interface ParsedPipe {
  readonly pipe: string;
  readonly variables?: Readonly<Record<string, string | readonly string[]>>;
}

interface ParsedCondition {
  readonly changesets?: {
    readonly includePaths?: readonly string[];
    readonly excludePaths?: readonly string[];
  };
  readonly state?: string;
}

/** The step body as parsed back from the rendered file, so assertions read the wire shape. */
interface ParsedStepBody {
  readonly "after-script"?: readonly (string | ParsedPipe)[];
  readonly artifacts?: readonly string[];
  readonly caches?: readonly string[];
  readonly clone?: { readonly depth?: number | string };
  readonly condition?: ParsedCondition;
  readonly "concurrency-group"?: string;
  readonly deployment?: string;
  readonly environment?: string;
  readonly "fail-fast"?: boolean;
  readonly image?: string | ParsedImage;
  readonly "max-time"?: number;
  readonly name?: string;
  readonly oidc?: boolean;
  readonly "runs-on"?: readonly string[];
  readonly script?: readonly string[];
  readonly services?: readonly string[];
  readonly size?: string;
  readonly trigger?: string;
}

interface ParsedDocument {
  readonly pipelines: { readonly default: readonly { readonly step: ParsedStepBody }[] };
}

const withStep = (body: Step): PipelineConfig =>
  pipelineConfig({ pipelines: { default: [step(body)] } });

const parseStep = (body: Step): ParsedStepBody => {
  const parsed: ParsedDocument = parse(render(withStep(body), { header: "" }));
  const first = parsed.pipelines.default[0];

  if (first === undefined) {
    throw new TypeError("expected a step");
  }

  return first.step;
};

const imageOf = (parsed: ParsedStepBody): ParsedImage => {
  const image = parsed.image;

  if (typeof image !== "object") {
    throw new TypeError("expected an image map");
  }

  return image;
};

const conditionOf = (parsed: ParsedStepBody): ParsedCondition => {
  const condition = parsed.condition;

  if (condition === undefined) {
    throw new TypeError("expected a condition");
  }

  return condition;
};

const FULL_BODY: Step = {
  trigger: "manual",
  size: "2x",
  services: ["docker"],
  script: ["npm test"],
  "runs-on": ["self.hosted", "linux"],
  oidc: true,
  name: "build",
  "max-time": 20,
  image: "node:18-bullseye",
  "fail-fast": false,
  environment: "production",
  deployment: "staging",
  "concurrency-group": "deploy",
  condition: { state: "SUCCESSFUL" },
  clone: { depth: 5 },
  caches: ["node"],
  artifacts: ["dist/**"],
  "after-script": ["echo done"],
};

describe("step body order", () => {
  it("emits every modelled key in the schema's alphabetical order", () => {
    expect(Object.keys(parseStep(FULL_BODY))).toStrictEqual([
      "after-script",
      "artifacts",
      "caches",
      "clone",
      "condition",
      "concurrency-group",
      "deployment",
      "environment",
      "fail-fast",
      "image",
      "max-time",
      "name",
      "oidc",
      "runs-on",
      "script",
      "services",
      "size",
      "trigger",
    ]);
  });

  it("emits every modelled value unchanged", () => {
    expect(parseStep(FULL_BODY)).toStrictEqual({
      "after-script": ["echo done"],
      artifacts: ["dist/**"],
      caches: ["node"],
      clone: { depth: 5 },
      condition: { state: "SUCCESSFUL" },
      "concurrency-group": "deploy",
      deployment: "staging",
      environment: "production",
      "fail-fast": false,
      image: "node:18-bullseye",
      "max-time": 20,
      name: "build",
      oidc: true,
      "runs-on": ["self.hosted", "linux"],
      script: ["npm test"],
      services: ["docker"],
      size: "2x",
      trigger: "manual",
    });
  });
});

describe("step image", () => {
  it("emits an image map with name, password and username in that order", () => {
    const image = imageOf(
      parseStep({
        image: { name: "private.registry/app:1", username: "robot", password: "$TOKEN" },
        script: ["true"],
      }),
    );

    expect(image).toStrictEqual({
      name: "private.registry/app:1",
      password: "$TOKEN",
      username: "robot",
    });
    expect(Object.keys(image)).toStrictEqual(["name", "password", "username"]);
  });

  it("emits a name-only image map", () => {
    expect(parseStep({ image: { name: "node:18" }, script: ["true"] }).image).toStrictEqual({
      name: "node:18",
    });
  });
});

describe("step sequences", () => {
  it("keeps arrays in author order", () => {
    const parsed = parseStep({
      artifacts: ["second/**", "first/**"],
      caches: ["b", "a"],
      "runs-on": ["z", "a"],
      services: ["docker", "postgres"],
      script: ["true"],
    });

    expect(parsed.artifacts).toStrictEqual(["second/**", "first/**"]);
    expect(parsed.caches).toStrictEqual(["b", "a"]);
    expect(parsed["runs-on"]).toStrictEqual(["z", "a"]);
    expect(parsed.services).toStrictEqual(["docker", "postgres"]);
  });

  it("accepts pipes in after-script, the same sequence shape as script", () => {
    const parsed = parseStep({
      script: ["npm test"],
      "after-script": [
        "echo teardown",
        pipe({ pipe: "atlassian/clean:1", variables: { PATHS: ["dist", "coverage"] } }),
      ],
    });

    expect(parsed["after-script"]).toStrictEqual([
      "echo teardown",
      { pipe: "atlassian/clean:1", variables: { PATHS: ["dist", "coverage"] } },
    ]);
  });
});

describe("step condition", () => {
  it("emits condition changesets then state", () => {
    const condition: Condition = {
      state: "SUCCESSFUL",
      changesets: { includePaths: ["src/**"] },
    };

    const emitted = conditionOf(parseStep({ condition, script: ["true"] }));

    expect(emitted).toStrictEqual({
      changesets: { includePaths: ["src/**"] },
      state: "SUCCESSFUL",
    });
    expect(Object.keys(emitted)).toStrictEqual(["changesets", "state"]);
  });

  it("emits a changesets excludePaths condition", () => {
    const parsed = parseStep({
      condition: { changesets: { excludePaths: ["docs/**", "*.md"] } },
      script: ["true"],
    });

    expect(parsed.condition).toStrictEqual({
      changesets: { excludePaths: ["docs/**", "*.md"] },
    });
  });

  it("does not emit absent fields", () => {
    expect(parseStep({ script: ["true"] })).toStrictEqual({ script: ["true"] });
  });
});
