import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Pipeline, pipeline, render } from "./index.js";
import type { Artifacts, Cache, Default } from "./types.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

const defaultText = (defaults: Default): string => bare(pipeline({ default: defaults, jobs: [] }));

describe("default image and services", () => {
  it("writes an image map with its entrypoint and pull policy", () => {
    const text = defaultText({
      image: { name: "golang:1.26", entrypoint: [""], pull_policy: "if-not-present" },
    });

    expect(parse(text).default.image).toStrictEqual({
      name: "golang:1.26",
      entrypoint: [""],
      pull_policy: "if-not-present",
    });
  });

  it("writes an image as a bare string", () => {
    expect(parse(defaultText({ image: "golang:1.26" })).default.image).toBe("golang:1.26");
  });

  it("writes services as strings and as maps, keeping both in order", () => {
    const services = [
      "postgres:16",
      {
        name: "redis:7",
        alias: "cache",
        entrypoint: ["/bin/sh"],
        command: ["redis-server"],
        variables: { REDIS_URL: "redis://cache:6379" },
      },
    ];

    expect(parse(defaultText({ services })).default.services).toStrictEqual(services);
  });
});

describe("default scripts and tags", () => {
  it("writes tags and both script fields, a string and a list", () => {
    const parsed = parse(
      defaultText({
        tags: ["gitlab-org", "docker"],
        before_script: "echo before",
        after_script: ["echo one", "echo two"],
      }),
    );

    expect(parsed.default.tags).toStrictEqual(["gitlab-org", "docker"]);
    expect(parsed.default.before_script).toBe("echo before");
    expect(parsed.default.after_script).toStrictEqual(["echo one", "echo two"]);
  });
});

describe("default cache", () => {
  it("writes a cache list, with every key, path and policy field", () => {
    const cache: readonly Cache[] = [
      {
        key: "go",
        paths: [".cache/go"],
        policy: "pull",
        untracked: true,
        when: "on_success",
        fallback_keys: ["go-main"],
      },
      {
        key: { files: ["go.sum", "v2/go.sum"], prefix: "build-" },
        paths: [".cache/build"],
        policy: "pull-push",
      },
    ];

    expect(parse(defaultText({ cache })).default.cache).toStrictEqual(cache);
  });

  it("writes a single cache as a map rather than a one-item list", () => {
    const cache: Cache = { key: { files: ["go.sum"] }, paths: [".cache/go"] };
    const parsed = parse(defaultText({ cache })).default.cache;

    expect(parsed).toStrictEqual(cache);
    expect(Array.isArray(parsed)).toBe(false);
  });
});

describe("default artifacts and retry", () => {
  it("writes every artifacts field, reports included", () => {
    const artifacts: Artifacts = {
      paths: ["dist/"],
      exclude: ["dist/tmp/"],
      name: "build-$CI_JOB_NAME",
      expire_in: "1 week",
      expose_as: "build",
      untracked: true,
      access: "maintainer",
      public: false,
      when: "always",
      reports: {
        junit: ["report.xml"],
        coverage_report: { coverage_format: "cobertura", path: "coverage/cobertura.xml" },
      },
    };

    expect(parse(defaultText({ artifacts })).default.artifacts).toStrictEqual(artifacts);
  });

  it("writes a retry count as a scalar", () => {
    expect(parse(defaultText({ retry: 2 })).default.retry).toBe(2);
  });

  it("writes a retry map with max, when and exit_codes", () => {
    const retry = { max: 2, when: ["runner_system_failure"], exit_codes: [137] };

    expect(parse(defaultText({ retry })).default.retry).toStrictEqual(retry);
  });

  it("writes timeout and interruptible", () => {
    const parsed = parse(defaultText({ timeout: "1h 30m", interruptible: true }));

    expect(parsed.default).toStrictEqual({ timeout: "1h 30m", interruptible: true });
  });
});

describe("default body order", () => {
  it("emits the modelled defaults in the spec's fixed order", () => {
    const text = defaultText({
      image: "golang:1.26",
      services: ["postgres:16"],
      tags: ["docker"],
      before_script: "echo before",
      after_script: "echo after",
      cache: { paths: [".cache/"] },
      artifacts: { paths: ["dist/"] },
      retry: 2,
      timeout: "1h",
      interruptible: false,
    });

    expect(Object.keys(parse(text).default)).toStrictEqual([
      "image",
      "services",
      "tags",
      "before_script",
      "after_script",
      "cache",
      "artifacts",
      "retry",
      "timeout",
      "interruptible",
    ]);
  });

  it("emits no key for a default it was not given", () => {
    expect(defaultText({ tags: ["docker"] })).toBe("default:\n  tags:\n    - docker\n");
  });

  it("emits no default at all when the pipeline declares none", () => {
    expect(bare(pipeline({ jobs: [] }))).toBe("{}\n");
  });
});
