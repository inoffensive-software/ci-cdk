import { describe, expect, it } from "vitest";

import { pipelineConfig, render, step } from "./index.js";
import { parsed, stepOf, withStep } from "./runtime-test-support.js";

describe("root image AWS arms", () => {
  it("emits aws before name", () => {
    const config = pipelineConfig({
      image: {
        aws: { "oidc-role": "${AWS_BB_PULL_ROLE}" },
        name: "123.dkr.ecr.us-east-1.amazonaws.com/app:1",
      },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(Object.keys(parsed(config).image ?? {})).toStrictEqual(["aws", "name"]);
    expect(render(config, { header: "" })).toContain(
      [
        "image:",
        "  aws:",
        "    oidc-role: ${AWS_BB_PULL_ROLE}",
        "  name: 123.dkr.ecr.us-east-1.amazonaws.com/app:1",
      ].join("\n"),
    );
  });

  it("emits the static key pair arm", () => {
    const config = pipelineConfig({
      image: {
        name: "123.dkr.ecr.us-east-1.amazonaws.com/app:1",
        aws: { "access-key": "${AWS_ACCESS_KEY_ID}", "secret-key": "${AWS_SECRET_ACCESS_KEY}" },
        "run-as-user": 1000,
      },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(parsed(config).image).toStrictEqual({
      name: "123.dkr.ecr.us-east-1.amazonaws.com/app:1",
      aws: { "access-key": "${AWS_ACCESS_KEY_ID}", "secret-key": "${AWS_SECRET_ACCESS_KEY}" },
      "run-as-user": 1000,
    });
  });
});

describe("step image arms", () => {
  it("keeps run-as-user on the name map alphabetically", () => {
    const config = withStep({ image: { name: "node:24", "run-as-user": 1000 }, script: ["true"] });

    expect(Object.keys(stepOf(config).image ?? {})).toStrictEqual(["name", "run-as-user"]);
  });

  it("keeps run-as-user after password and before username", () => {
    const config = withStep({
      image: { name: "node:24", password: "${PASSWORD}", "run-as-user": 1000, username: "builder" },
      script: ["true"],
    });

    expect(Object.keys(stepOf(config).image ?? {})).toStrictEqual([
      "name",
      "password",
      "run-as-user",
      "username",
    ]);
  });

  it("emits the ECR role arm on a step image", () => {
    const config = withStep({
      image: {
        name: "123.dkr.ecr.us-east-1.amazonaws.com/app:1",
        aws: { "oidc-role": "${AWS_BB_PULL_ROLE}" },
        "run-as-user": 0,
      },
      script: ["true"],
    });

    expect(stepOf(config).image).toStrictEqual({
      name: "123.dkr.ecr.us-east-1.amazonaws.com/app:1",
      aws: { "oidc-role": "${AWS_BB_PULL_ROLE}" },
      "run-as-user": 0,
    });
  });
});

describe("service image arms", () => {
  it("emits a service image map", () => {
    const config = pipelineConfig({
      definitions: {
        services: {
          registry: {
            image: {
              aws: { "oidc-role": "${AWS_BB_PULL_ROLE}" },
              name: "123.dkr.ecr.us-east-1.amazonaws.com/postgres:17",
              "run-as-user": 70,
            },
            memory: 2048,
          },
        },
      },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(parsed(config).definitions?.services?.["registry"]?.image).toStrictEqual({
      aws: { "oidc-role": "${AWS_BB_PULL_ROLE}" },
      name: "123.dkr.ecr.us-east-1.amazonaws.com/postgres:17",
      "run-as-user": 70,
    });
  });
});

describe("service image string arms", () => {
  it("still accepts the string and name-only forms", () => {
    const config = pipelineConfig({
      definitions: {
        services: {
          database: { image: "postgres:17" },
          other: { image: { name: "redis:7" } },
        },
      },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(parsed(config).definitions?.services?.["database"]?.image).toBe("postgres:17");
    expect(parsed(config).definitions?.services?.["other"]?.image).toStrictEqual({
      name: "redis:7",
    });
  });

  it("emits the service credential pair", () => {
    const config = pipelineConfig({
      definitions: {
        services: {
          private: {
            image: {
              name: "registry.example.com/postgres:17",
              username: "builder",
              password: "${REGISTRY_PASSWORD}",
              "run-as-user": 70,
            },
          },
        },
      },
      pipelines: { default: [step({ script: ["true"] })] },
    });

    expect(
      Object.keys(parsed(config).definitions?.services?.["private"]?.image ?? {}),
    ).toStrictEqual(["name", "password", "run-as-user", "username"]);
  });
});
