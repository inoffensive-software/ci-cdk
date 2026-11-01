import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic, type Value } from "../core/index.js";
import { type Pipeline, job, pipeline, render, toDoc } from "./index.js";

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

const pairsOf = (run: () => void): readonly { path: string; message: string }[] =>
  diagnosticsOf(run).map(({ path, message }) => ({ path, message }));

const pathsOf = (run: () => void): readonly string[] => diagnosticsOf(run).map(({ path }) => path);

/** A pipeline with one modelled job, so both raw levels can be checked at once. */
const withRawJob = (raw: Readonly<Record<string, Value>>): Pipeline =>
  pipeline({ jobs: [job({ name: "build", stage: "build", script: "npm ci", raw })] });

describe("raw placement", () => {
  it("appends pipeline raw entries after stages and jobs in insertion order", () => {
    const text = render(
      pipeline({
        stages: ["build"],
        jobs: [job({ name: "build", stage: "build", script: "npm ci" })],
        raw: {
          image: "node:24",
          cache: { paths: [".npm"] },
        },
      }),
      { header: "" },
    );

    expect(Object.keys(parse(text))).toStrictEqual(["stages", "build", "image", "cache"]);
  });
});

describe("job raw placement", () => {
  it("appends job raw entries after stage and script in insertion order", () => {
    const text = render(
      pipeline({
        jobs: [
          job({
            name: "build",
            stage: "build",
            script: "npm ci",
            raw: {
              inputs: { DEPLOY_ENV: "staging" },
              publish: "public",
            },
          }),
        ],
      }),
      { header: "" },
    );

    const parsed = parse(text);

    expect(Object.keys(parsed.build)).toStrictEqual(["stage", "script", "inputs", "publish"]);
  });
});

describe("modelled keys stay first", () => {
  it("writes a typed secrets block before raw keys however the struct is written", () => {
    const text = render(
      pipeline({
        jobs: [
          job({
            name: "build",
            stage: "build",
            script: "npm ci",
            secrets: { TOKEN: { vault: "secret" } },
            raw: { publish: "public" },
          }),
        ],
      }),
      { header: "" },
    );

    const parsed = parse(text);
    expect(Object.keys(parsed)).toStrictEqual(["build"]);
    expect(Object.keys(parsed.build)).toStrictEqual(["stage", "secrets", "script", "publish"]);
  });
});

describe("raw values", () => {
  it("round-trips maps, sequences, numbers, booleans, nulls and quoted strings", () => {
    const raw = {
      custom: {
        PLAIN: "value",
        NUMBERISH: "1.10",
        BOOLEANISH: "yes",
        COLON: "a: b",
        HASH: "x # y",
      },
      matrix: [{ name: 1, enabled: true, missing: null }],
      deep: { nested: { list: ["a", 2, false, null] } },
      count: 3,
      ratio: 1.5,
      enabled: true,
      nothing: null,
    };

    const text = render(pipeline({ jobs: [], raw }), { header: "" });

    expect(parse(text)).toStrictEqual(raw);
  });

  it("writes a hidden template and a global keyword at the document root", () => {
    const text = render(
      pipeline({
        jobs: [job({ name: "build", script: "true" })],
        raw: {
          image: "node:24",
          ".template": { before_script: ["npm ci"] },
        },
      }),
      { header: "" },
    );

    const parsed = parse(text);

    expect(Object.keys(parsed)).toStrictEqual(["build", "image", ".template"]);
    expect(parsed.image).toBe("node:24");
    expect(parsed[".template"]).toStrictEqual({ before_script: ["npm ci"] });
  });
});

describe("raw collisions", () => {
  it("refuses a pipeline raw key of stages or a job name", () => {
    const refused = pipeline({
      stages: ["build"],
      jobs: [job({ name: "build", stage: "build", script: "true" })],
      raw: { stages: ["test"], build: { script: "echo no" } },
    });

    expect(pairsOf(() => toDoc(refused))).toStrictEqual([
      {
        path: '$.raw["stages"]',
        message: 'raw key "stages" is already emitted at this level',
      },
      {
        path: '$.raw["build"]',
        message: 'raw key "build" is already emitted at this level',
      },
    ]);
  });

  it("refuses stages and include even when the pipeline declares neither", () => {
    const refused = pipeline({ jobs: [], raw: { stages: ["build"], include: "other.yml" } });

    expect(pathsOf(() => toDoc(refused))).toStrictEqual(['$.raw["stages"]', '$.raw["include"]']);
  });
});

describe("job raw collisions", () => {
  it("refuses a job raw key of name, stage, script or trigger", () => {
    const refused = withRawJob({
      name: "other",
      stage: "deploy",
      script: "echo no",
      trigger: { project: "group/downstream" },
    });

    expect(pairsOf(() => toDoc(refused))).toStrictEqual([
      {
        path: '$.jobs[0].raw["name"]',
        message: 'raw key "name" is already emitted at this level',
      },
      {
        path: '$.jobs[0].raw["stage"]',
        message: 'raw key "stage" is already emitted at this level',
      },
      {
        path: '$.jobs[0].raw["script"]',
        message: 'raw key "script" is already emitted at this level',
      },
      {
        path: '$.jobs[0].raw["trigger"]',
        message: 'raw key "trigger" is already emitted at this level',
      },
    ]);
  });
});

describe("raw secrets", () => {
  it("refuses secrets even when the job declares none", () => {
    const refused = withRawJob({ secrets: { TOKEN: { vault: "secret" } } });

    expect(pathsOf(() => toDoc(refused))).toStrictEqual(['$.jobs[0].raw["secrets"]']);
  });
});

describe("raw script without the field", () => {
  it("refuses raw script on a job that declares none", () => {
    const refused = pipeline({ jobs: [job({ name: "override", raw: { script: "echo no" } })] });

    expect(pairsOf(() => toDoc(refused))).toStrictEqual([
      {
        path: '$.jobs[0].raw["script"]',
        message: 'raw key "script" is already emitted at this level',
      },
    ]);
  });
});

describe("raw non-records", () => {
  it("refuses a pipeline raw block that is not a plain record", () => {
    const map = pipeline({
      jobs: [],
      // @ts-expect-error raw is a record of keys to values, not a Map
      raw: new Map([["badge", "ci"]]),
    });

    const sequence = pipeline({
      jobs: [],
      // @ts-expect-error raw is a record of keys to values, not an array
      raw: ["badge"],
    });

    expect(pairsOf(() => toDoc(map))).toStrictEqual([
      { path: "$.raw", message: "a Map is not plain data" },
    ]);
    expect(pairsOf(() => toDoc(sequence))).toStrictEqual([
      { path: "$.raw", message: "raw must be a plain record of keys to values" },
    ]);
  });

  it("refuses a job raw block that is not a plain record", () => {
    const refused = pipeline({
      jobs: [
        job({
          name: "build",
          script: "true",
          // @ts-expect-error raw is a record of keys to values, not a Set
          raw: new Set(["badge"]),
        }),
      ],
    });

    expect(pairsOf(() => toDoc(refused))).toStrictEqual([
      { path: "$.jobs[0].raw", message: "a Set is not plain data" },
    ]);
  });
});

describe("raw boundary failures", () => {
  it("rebases a pipeline raw failure onto the entry the author wrote", () => {
    const refused = pipeline({
      jobs: [],
      // @ts-expect-error a Date is not plain data
      raw: { custom: { BROKEN: new Date(0) } },
    });

    expect(pairsOf(() => toDoc(refused))).toStrictEqual([
      { path: "$.raw.custom.BROKEN", message: "a Date is not plain data" },
    ]);
  });

  it("rebases a nested job raw failure onto the entry the author wrote", () => {
    // @ts-expect-error a Date is not plain data
    const refused = withRawJob({ list: ["fine", new Date(0)] });

    expect(pairsOf(() => toDoc(refused))).toStrictEqual([
      { path: "$.jobs[0].raw.list[1]", message: "a Date is not plain data" },
    ]);
  });
});

describe("raw diagnostic collection", () => {
  it("throws one DiagnosticError carrying the modelled and raw problems", () => {
    const broken = pipeline({
      jobs: [
        job({ name: "build", script: "" }),
        job({
          name: "lint",
          script: "true",
          raw: { script: "echo no" },
        }),
      ],
      raw: { build: {} },
    });

    expect(pathsOf(() => toDoc(broken))).toStrictEqual([
      "$.jobs[0].script",
      '$.jobs[1].raw["script"]',
      '$.raw["build"]',
    ]);
  });
});
