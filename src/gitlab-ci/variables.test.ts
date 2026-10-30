import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Pipeline, job, pipeline, render } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

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
