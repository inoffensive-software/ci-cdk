import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Pipeline, job, pipeline, render } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

const TARGET = {
  value: "staging",
  expand: false,
  options: ["staging", "production"],
  description: "the environment to release",
} as const;

describe("variables", () => {
  it("keeps a numeric-looking string a string and a number a number", () => {
    const text = bare(
      pipeline({
        variables: { STABLE_VERSION: "1.5", PARALLEL: 4, ENABLED: "true" },
        jobs: [job({ name: "build", variables: { RETRIES: "3" }, script: "true" })],
      }),
    );

    expect(text).toContain('STABLE_VERSION: "1.5"');
    expect(parse(text).variables).toStrictEqual({
      STABLE_VERSION: "1.5",
      PARALLEL: 4,
      ENABLED: "true",
    });
    expect(parse(text).build.variables).toStrictEqual({ RETRIES: "3" });
  });

  it("keeps the author's order in a variables map", () => {
    const parsed = parse(
      bare(pipeline({ variables: { ZULU: "z", ALPHA: "a", MIKE: "m" }, jobs: [] })),
    );

    expect(Object.keys(parsed.variables)).toStrictEqual(["ZULU", "ALPHA", "MIKE"]);
  });

  it("writes a job's variables before its script", () => {
    const parsed = parse(
      bare(
        pipeline({
          jobs: [
            job({
              name: "build",
              stage: "build",
              variables: { GOFLAGS: "-mod=readonly" },
              script: "go build",
            }),
          ],
        }),
      ),
    );

    expect(Object.keys(parsed.build)).toStrictEqual(["stage", "variables", "script"]);
  });
});

describe("variables values", () => {
  it("keeps a boolean a boolean", () => {
    const parsed = parse(
      bare(pipeline({ variables: { CGO_ENABLED: false, DEBUG: true }, jobs: [] })),
    );

    expect(parsed.variables).toStrictEqual({ CGO_ENABLED: false, DEBUG: true });
  });
});

describe("variable map at pipeline and job level", () => {
  it("accepts the map form beside a scalar", () => {
    const parsed = parse(
      bare(
        pipeline({
          variables: { SCALAR: "plain", TARGET },
          jobs: [
            job({
              name: "deploy",
              variables: { DEPLOY_ENV: { value: "production", expand: true } },
              script: "true",
            }),
          ],
        }),
      ),
    );

    expect(parsed.variables).toStrictEqual({ SCALAR: "plain", TARGET });
    expect(parsed.deploy.variables).toStrictEqual({
      DEPLOY_ENV: { value: "production", expand: true },
    });
  });
});

describe("variable map at service and rule level", () => {
  it("accepts the map form on a service and in a rule", () => {
    const parsed = parse(
      bare(
        pipeline({
          default: {
            services: [{ name: "redis:7", variables: { REDIS_DB: { value: 1, expand: false } } }],
          },
          jobs: [
            job({
              name: "deploy",
              services: [
                {
                  name: "postgres:16",
                  variables: { PG_DB: { value: "app", expand: false } },
                },
              ],
              rules: [{ variables: { TARGET: { value: "release", expand: false } } }],
              script: "true",
            }),
          ],
        }),
      ),
    );

    expect(parsed.default.services[0].variables).toStrictEqual({
      REDIS_DB: { value: 1, expand: false },
    });
    expect(parsed.deploy.services[0].variables).toStrictEqual({
      PG_DB: { value: "app", expand: false },
    });
    expect(parsed.deploy.rules[0].variables).toStrictEqual({
      TARGET: { value: "release", expand: false },
    });
  });
});

describe("variable map shape", () => {
  it("writes the object keys in documented order", () => {
    const text = bare(
      pipeline({
        variables: {
          TARGET: {
            description: "the environment",
            options: ["staging", "production"],
            expand: false,
            value: "staging",
          },
        },
        jobs: [],
      }),
    );

    const body = text.slice(text.indexOf("TARGET:"));
    const keys = ["value:", "expand:", "options:", "description:"];
    const indexes = keys.map((key) => body.indexOf(key));

    expect(indexes).toStrictEqual([...indexes].toSorted((a, b) => a - b));
  });

  it("emits nothing for an absent key and keeps the map's bare value", () => {
    const parsed = parse(bare(pipeline({ variables: { BARE: { value: "only" } }, jobs: [] })));

    expect(parsed.variables.BARE).toStrictEqual({ value: "only" });
  });

  it("keeps the author's variable order when the forms mix", () => {
    const parsed = parse(
      bare(pipeline({ variables: { ZULU: "z", ALPHA: { value: "a" }, MIKE: 3 }, jobs: [] })),
    );

    expect(Object.keys(parsed.variables)).toStrictEqual(["ZULU", "ALPHA", "MIKE"]);
  });
});
