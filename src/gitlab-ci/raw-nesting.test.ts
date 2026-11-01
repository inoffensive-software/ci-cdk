import { describe, expect, it } from "vitest";

import { DiagnosticError, type Diagnostic, type Value } from "../core/index.js";
import { type Pipeline, job, pipeline, toDoc } from "./index.js";

const pathsOf = (run: () => void): readonly string[] => {
  try {
    run();
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics.map(({ path }: Diagnostic) => path);
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

/** A pipeline with one modelled job, so both raw levels can be checked at once. */
const withRawJob = (raw: Readonly<Record<string, Value>>): Pipeline =>
  pipeline({ jobs: [job({ name: "build", stage: "build", script: "npm ci", raw })] });

describe("raw nesting parents", () => {
  it("refuses the parents of the nested options even when the job declares none", () => {
    const refused = withRawJob({
      needs: [{ job: "upstream", project: "group/upstream" }],
      rules: [{ exists: { regexp: "^ci/" } }],
      variables: { TARGET: { value: "staging" } },
      cache: { key: { files_commits: ["go.sum"] }, paths: [".cache"] },
    });

    expect(pathsOf(() => toDoc(refused))).toStrictEqual([
      '$.jobs[0].raw["needs"]',
      '$.jobs[0].raw["rules"]',
      '$.jobs[0].raw["variables"]',
      '$.jobs[0].raw["cache"]',
    ]);
  });

  it("refuses a pipeline variables key even when the pipeline declares none", () => {
    const refused = pipeline({ jobs: [], raw: { variables: { TARGET: { value: "staging" } } } });

    expect(pathsOf(() => toDoc(refused))).toStrictEqual(['$.raw["variables"]']);
  });
});
