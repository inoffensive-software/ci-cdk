import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic, type Value } from "../core/index.js";
import { type Job, type Pipeline, job, pipeline, render, toDoc } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

/** One job, so each field reads as the body it produces rather than as a whole document. */
const body = (fields: Omit<Job, "name">): Readonly<Record<string, Value>> =>
  parse(bare(pipeline({ jobs: [job({ name: "build", ...fields })] }))).build;

const diagnosticsOf = (run: () => void): readonly Diagnostic[] => {
  try {
    run();
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics;
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

describe("job image", () => {
  it("writes an image map with its entrypoint and pull policy", () => {
    const image = {
      name: "gcr.io/go-containerregistry/crane:debug",
      entrypoint: [""],
      pull_policy: "if-not-present",
    } as const;

    expect(body({ image })["image"]).toStrictEqual(image);
  });

  it("writes an image as a bare string", () => {
    expect(body({ image: "golang:1.26" })["image"]).toBe("golang:1.26");
  });
});

describe("job services", () => {
  it("writes strings and maps in author order", () => {
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

    expect(body({ services })["services"]).toStrictEqual(services);
  });
});

describe("job scripts", () => {
  it("writes before_script and after_script as a string and as a list", () => {
    const parsed = body({
      before_script: "echo before",
      script: "echo script",
      after_script: ["echo one", "echo two"],
    });

    expect(parsed["before_script"]).toBe("echo before");
    expect(parsed["script"]).toBe("echo script");
    expect(parsed["after_script"]).toStrictEqual(["echo one", "echo two"]);
  });

  it("never emits a block scalar for a multi-line command", () => {
    const text = bare(
      pipeline({
        jobs: [job({ name: "build", before_script: "echo one\necho two", script: "true" })],
      }),
    );

    expect(text).not.toMatch(/[|>]\s*$/mu);
    expect(parse(text).build.before_script).toBe("echo one\necho two");
  });
});

describe("job tags and extends", () => {
  it("writes tags as a string list", () => {
    expect(body({ tags: ["gitlab-org", "docker"] })["tags"]).toStrictEqual([
      "gitlab-org",
      "docker",
    ]);
  });

  it("writes one extends target or several, unresolved", () => {
    expect(body({ extends: ".common" })["extends"]).toBe(".common");
    expect(body({ extends: [".common", ".go-cache"] })["extends"]).toStrictEqual([
      ".common",
      ".go-cache",
    ]);
  });
});

describe("job cache", () => {
  it("writes a single cache as a map and several as a list", () => {
    const single = { key: "go", paths: [".cache/go"] };

    expect(body({ cache: single })["cache"]).toStrictEqual(single);
    expect(body({ cache: [single, { paths: [".cache/build"] }] })["cache"]).toStrictEqual([
      single,
      { paths: [".cache/build"] },
    ]);
  });

  it("writes every cache field, a string key and a files/prefix key", () => {
    const cache = [
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
    ] as const;

    expect(body({ cache })["cache"]).toStrictEqual(cache);
  });
});

describe("job artifacts", () => {
  it("writes every artifacts field, keeping report order and a single report path", () => {
    const artifacts = {
      paths: ["dist/"],
      exclude: ["dist/tmp/"],
      name: "build-$CI_JOB_NAME",
      expire_in: "1 week",
      expose_as: "build",
      public: true,
      when: "always",
      reports: { codequality: "gl-code-quality-report.json", junit: ["report.xml"] },
    } as const;

    const text = bare(pipeline({ jobs: [job({ name: "build", artifacts })] }));

    expect(body({ artifacts })["artifacts"]).toStrictEqual(artifacts);
    expect(text.indexOf("codequality:")).toBeLessThan(text.indexOf("junit:"));
  });
});

describe("job emission order", () => {
  it("emits the modelled fields in the spec's fixed order, then raw", () => {
    const parsed = parse(
      bare(
        pipeline({
          jobs: [
            job({
              name: "build",
              after_script: "echo after",
              raw: { needs: ["prep"] },
              script: ["make"],
              before_script: "echo before",
              artifacts: { paths: ["dist/"] },
              cache: { paths: [".cache/"] },
              variables: { CI: "true" },
              services: ["postgres:16"],
              image: "golang:1.26",
              tags: ["docker"],
              extends: ".common",
              stage: "build",
            }),
          ],
        }),
      ),
    );

    expect(Object.keys(parsed.build)).toStrictEqual([
      "stage",
      "extends",
      "tags",
      "image",
      "services",
      "variables",
      "cache",
      "artifacts",
      "before_script",
      "script",
      "after_script",
      "needs",
    ]);
  });

  it("emits no key for a field it was not given", () => {
    expect(body({ script: "true" })).toStrictEqual({ script: "true" });
    expect(bare(pipeline({ jobs: [job({ name: "build" })] }))).toBe("build: {}\n");
  });
});

describe("job raw collisions", () => {
  it("refuses every newly modelled key in raw", () => {
    const refused = pipeline({
      jobs: [
        job({
          name: "build",
          script: "true",
          raw: {
            image: "golang:1.26",
            services: ["postgres:16"],
            before_script: ["make"],
            after_script: ["make"],
            tags: ["docker"],
            extends: ".common",
            cache: { paths: [".cache/"] },
            artifacts: { paths: ["dist/"] },
          },
        }),
      ],
    });

    expect(diagnosticsOf(() => toDoc(refused)).map((item) => item.path)).toStrictEqual([
      '$.jobs[0].raw["image"]',
      '$.jobs[0].raw["services"]',
      '$.jobs[0].raw["before_script"]',
      '$.jobs[0].raw["after_script"]',
      '$.jobs[0].raw["tags"]',
      '$.jobs[0].raw["extends"]',
      '$.jobs[0].raw["cache"]',
      '$.jobs[0].raw["artifacts"]',
    ]);
  });

  it("still allows raw for a keyword the vocabulary does not model", () => {
    expect(body({ raw: { needs: ["prep"] } })).toStrictEqual({ needs: ["prep"] });
  });
});

describe("job fundamentals golden", () => {
  it("pins the full job body on bytes", async () => {
    const text = bare(
      pipeline({
        stages: ["build"],
        jobs: [
          job({
            name: "build",
            stage: "build",
            extends: [".common", ".go-cache"],
            tags: ["gitlab-org", "docker"],
            image: {
              name: "gcr.io/go-containerregistry/crane:debug",
              entrypoint: [""],
              pull_policy: "never",
            },
            services: [
              "postgres:16",
              {
                name: "redis:7",
                alias: "cache",
                command: ["redis-server"],
                variables: { REDIS_URL: "redis://cache:6379" },
              },
            ],
            variables: { CI: "true" },
            cache: {
              key: { files: ["go.sum"], prefix: "build-" },
              paths: [".cache/go"],
              policy: "pull-push",
            },
            artifacts: {
              paths: ["dist/"],
              expire_in: "1 week",
              reports: { junit: ["report.xml"] },
            },
            before_script: ["make deps"],
            script: ["make build"],
            after_script: "echo done",
            raw: { needs: ["prep"] },
          }),
        ],
      }),
    );

    await expect(text).toMatchFileSnapshot("__snapshots__/job-fundamentals.yml");
  });
});
