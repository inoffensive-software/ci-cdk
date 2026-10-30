import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
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

const withTemplate = (templates: NonNullable<Pipeline["templates"]>): Pipeline =>
  pipeline({
    stages: ["build"],
    templates,
    jobs: [job({ name: "build", stage: "build", script: "npm run build" })],
  });

describe("template placement", () => {
  it("emits templates after stages and before the jobs, in record order", () => {
    const text = render(
      withTemplate({
        ".zulu": { before_script: ["npm ci"] },
        ".alpha": { variables: { A: "b" } },
      }),
      { header: "" },
    );

    expect(Object.keys(parse(text) as object)).toStrictEqual([
      "stages",
      ".zulu",
      ".alpha",
      "build",
    ]);
  });

  it("lowers values as plain data of any shape, round-tripping through the emitter", () => {
    const templates = {
      ".versions": {
        parallel: {
          matrix: [
            { VERSION: "1.5", STABLE: true },
            { VERSION: 2, STABLE: false },
          ],
        },
        variables: { NOTE: "a: b", NUMBERISH: "1.10", MISSING: null },
        script: ["echo one", "echo two"],
      },
    };

    const parsed = parse(render(withTemplate(templates), { header: "" })) as {
      ".versions": object;
    };

    expect(parsed[".versions"]).toStrictEqual(templates[".versions"]);
  });
});

describe("template keys", () => {
  it("refuses a key without the leading dot, naming the author's position", () => {
    const refused = withTemplate({ build: { script: "echo no" } });

    expect(pairsOf(() => toDoc(refused))).toStrictEqual([
      {
        path: '$.templates["build"]',
        message: 'template key "build" must start with "."',
      },
    ]);
  });

  it("refuses a hidden key written through pipeline raw, so it is emitted once", () => {
    const refused = pipeline({
      jobs: [],
      templates: { ".setup": { script: ["npm ci"] } },
      raw: { ".setup": { script: ["echo no"] } },
    });

    expect(pairsOf(() => toDoc(refused))).toStrictEqual([
      {
        path: '$.raw[".setup"]',
        message: 'raw key ".setup" is already emitted at this level',
      },
    ]);
  });
});

describe("template boundary", () => {
  it("rebases a value the boundary refuses onto the template the author wrote", () => {
    // @ts-expect-error a Date is not plain data
    const refused = withTemplate({ ".broken": { script: ["fine", new Date(0)] } });

    expect(pairsOf(() => toDoc(refused))).toStrictEqual([
      { path: '$.templates[".broken"].script[1]', message: "a Date is not plain data" },
    ]);
  });
});
