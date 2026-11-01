import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import type { Value } from "../core/index.js";
import { type Job, type Pipeline, job, pipeline, render } from "./index.js";
import type { Default } from "./types.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

/** One job, so each shape reads as the body it produces rather than as a whole document. */
const jobBody = (fields: Omit<Job, "name">): Readonly<Record<string, Value>> =>
  parse(bare(pipeline({ jobs: [job({ name: "build", ...fields })] }))).build;

/** One `default` body, so a default-level shape reads as the map it produces. */
const defaultBody = (defaults: Default): Readonly<Record<string, Value>> =>
  parse(bare(pipeline({ default: defaults, jobs: [] }))).default;

describe("job image executor options", () => {
  const image = {
    name: "super/sql:experimental",
    entrypoint: [""],
    docker: { platform: "arm64/v8", user: "dave" },
    kubernetes: { user: 1001 },
    pull_policy: ["always", "if-not-present"],
  } as const;

  it("writes docker, kubernetes and a pull policy list in the docs' order", () => {
    const parsed = parse(bare(pipeline({ jobs: [job({ name: "build", image })] }))).build;

    expect(jobBody({ image })["image"]).toStrictEqual(image);
    expect(Object.keys(parsed.image)).toStrictEqual([
      "name",
      "entrypoint",
      "docker",
      "kubernetes",
      "pull_policy",
    ]);
  });

  it("keeps a single pull policy a scalar and omits absent executor options", () => {
    expect(
      jobBody({ image: { name: "alpine:3.20", pull_policy: "always" } })["image"],
    ).toStrictEqual({
      name: "alpine:3.20",
      pull_policy: "always",
    });
    expect(jobBody({ image: { name: "alpine:3.20" } })["image"]).toStrictEqual({
      name: "alpine:3.20",
    });
  });
});

describe("job service executor options", () => {
  const services = [
    "postgres:16",
    {
      name: "redis:7",
      alias: "cache",
      docker: { platform: "arm64/v8", user: "dave" },
      kubernetes: { user: "1001:1001" },
      entrypoint: ["/bin/sh"],
      command: ["redis-server"],
      variables: { REDIS_URL: "redis://cache:6379" },
      pull_policy: ["always", "if-not-present"],
    },
  ] as const;

  it("writes docker, kubernetes and a pull policy in the docs' order", () => {
    const parsed = parse(bare(pipeline({ jobs: [job({ name: "build", services })] }))).build;

    expect(jobBody({ services })["services"]).toStrictEqual(services);
    expect(parsed.services[0]).toBe("postgres:16");
    expect(Object.keys(parsed.services[1])).toStrictEqual([
      "name",
      "alias",
      "docker",
      "kubernetes",
      "entrypoint",
      "command",
      "variables",
      "pull_policy",
    ]);
  });

  it("keeps a single service pull policy a scalar and omits absent executor options", () => {
    expect(
      jobBody({ services: [{ name: "postgres:16", pull_policy: "never" }] })["services"],
    ).toStrictEqual([{ name: "postgres:16", pull_policy: "never" }]);
    expect(jobBody({ services: [{ name: "postgres:16" }] })["services"]).toStrictEqual([
      { name: "postgres:16" },
    ]);
  });
});

describe("default image and service executor options", () => {
  it("writes the executor options and a pull policy list under a default image", () => {
    const image = {
      name: "golang:1.26",
      docker: { platform: "arm64/v8", user: "dave" },
      kubernetes: { user: "1001:1001" },
      pull_policy: ["always", "if-not-present"],
    } as const;

    expect(defaultBody({ image })["image"]).toStrictEqual(image);
  });

  it("omits an absent executor option from a default image map", () => {
    const image = { name: "golang:1.26", docker: {} } as const;

    expect(defaultBody({ image })["image"]).toStrictEqual(image);
  });

  it("writes executor options and a pull policy under a default service", () => {
    const services = [
      {
        name: "super/sql:experimental",
        docker: { platform: "arm64/v8", user: "dave" },
        kubernetes: { user: 1001 },
        pull_policy: ["always", "never"],
      },
    ] as const;

    expect(defaultBody({ services })["services"]).toStrictEqual(services);
  });
});
