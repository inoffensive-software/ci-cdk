import { describe, expect, it } from "vitest";

import { DiagnosticError, type Diagnostic, type Doc } from "../core/index.js";
import { job, pipeline, toDoc } from "./index.js";

const pathsOf = (run: () => void): readonly string[] => {
  try {
    run();
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics.map((diagnostic: Diagnostic) => diagnostic.path);
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

const keysOf = (run: () => Doc): readonly string[] => {
  const doc = run();

  if (doc.kind !== "map") {
    throw new Error("expected a map");
  }

  return doc.entries.map((entry) => entry.key);
};

describe("pipeline emission order", () => {
  it("writes default, include, stages, variables, workflow, templates, jobs, then raw", () => {
    expect(
      keysOf(() =>
        toDoc(
          pipeline({
            jobs: [job({ name: "build", script: "true" })],
            raw: { image: "node:24" },
            templates: { ".setup": { before_script: ["npm ci"] } },
            workflow: { rules: [{ if: "$CI_COMMIT_BRANCH" }] },
            variables: { CI: "true" },
            stages: ["build"],
            include: { local: "ci.yml" },
            default: { image: "node:24" },
          }),
        ),
      ),
    ).toStrictEqual([
      "default",
      "include",
      "stages",
      "variables",
      "workflow",
      ".setup",
      "build",
      "image",
    ]);
  });
});

describe("pipeline emission order is independent of the struct", () => {
  it("keeps the struct's own order out of it", () => {
    const reordered = pipeline({
      raw: { image: "node:24" },
      jobs: [job({ name: "build", script: "true" })],
      stages: ["build"],
      workflow: { rules: [] },
      variables: { CI: "true" },
      include: { local: "ci.yml" },
      default: { image: "node:24" },
    });

    expect(keysOf(() => toDoc(reordered))).toStrictEqual([
      "default",
      "include",
      "stages",
      "variables",
      "workflow",
      "build",
      "image",
    ]);
  });
});

describe("raw collisions with the modelled globals", () => {
  it("refuses a pipeline raw key of default, include, variables or workflow", () => {
    const refused = pipeline({
      jobs: [],
      raw: {
        workflow: {},
        variables: { A: "b" },
        include: [],
        default: {},
      },
    });

    expect(pathsOf(() => toDoc(refused))).toStrictEqual([
      '$.raw["workflow"]',
      '$.raw["variables"]',
      '$.raw["include"]',
      '$.raw["default"]',
    ]);
  });

  it("refuses those keys even when the pipeline declares none of them", () => {
    expect(pathsOf(() => toDoc(pipeline({ jobs: [], raw: { default: {} } })))).toStrictEqual([
      '$.raw["default"]',
    ]);
  });
});

describe("raw collisions at the job level", () => {
  it("refuses a job raw key of variables, and keeps name, stage and script reserved", () => {
    const refused = pipeline({
      jobs: [
        job({
          name: "build",
          variables: { A: "b" },
          script: "true",
          raw: { variables: { A: "b" }, stage: "build" },
        }),
      ],
    });

    expect(pathsOf(() => toDoc(refused))).toStrictEqual([
      '$.jobs[0].raw["variables"]',
      '$.jobs[0].raw["stage"]',
    ]);
  });

  it("refuses a pipeline raw key that a job name or a template key already took", () => {
    const refused = pipeline({
      templates: { ".setup": { script: ["npm ci"] } },
      jobs: [job({ name: "build", script: "true" })],
      raw: { ".setup": {}, build: {} },
    });

    expect(pathsOf(() => toDoc(refused))).toStrictEqual(['$.raw[".setup"]', '$.raw["build"]']);
  });
});
