import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { pipeline, render } from "./index.js";
import type { Include, IncludeEntry } from "./types.js";

const includeText = (include: Include): string =>
  render(pipeline({ include, jobs: [] }), { header: "" });

const ENTRIES: readonly IncludeEntry[] = [
  { local: ".gitlab/ci/prepare.yml", rules: [{ if: "$CI_COMMIT_BRANCH" }] },
  {
    remote: "https://example.com/ci.yml",
    integrity: `sha256-${"A".repeat(43)}=`,
    rules: [{ exists: ["ci.yml"] }],
  },
  { template: "Nodejs.gitlab-ci.yml" },
  { project: "group/project", ref: "main", file: "templates/one.yml" },
  {
    component: "gitlab.com/components/danger@1.0",
    inputs: { job_name: "danger", stage: "test", blocking: false, retries: 2 },
    rules: [{ when: "never" }],
  },
];

describe("include entries", () => {
  it("writes every source as data, in the author's shape", () => {
    expect(parse(includeText(ENTRIES)).include).toStrictEqual(ENTRIES);
  });

  it("keeps a project's file list a list and its ref beside the project", () => {
    const entry: IncludeEntry = {
      project: "group/project",
      ref: "v1.2",
      file: ["one.yml", "two.yml"],
    };

    expect(parse(includeText(entry)).include).toStrictEqual({
      project: "group/project",
      ref: "v1.2",
      file: ["one.yml", "two.yml"],
    });
  });

  it("keeps one include entry a map rather than a one-item sequence", () => {
    const parsed = parse(includeText({ local: "ci.yml" })).include;

    expect(parsed).toStrictEqual({ local: "ci.yml" });
    expect(Array.isArray(parsed)).toBe(false);
  });
});

describe("include entry order and inputs", () => {
  it("keeps the discriminator first, then the fields that shape the entry", () => {
    const text = includeText({
      rules: [{ when: "always" }],
      project: "group/project",
      ref: "main",
      file: "ci.yml",
    });

    expect(text).toBe(
      "include:\n" +
        "  project: group/project\n" +
        "  ref: main\n" +
        "  file: ci.yml\n" +
        "  rules:\n" +
        "    - when: always\n",
    );
  });

  it("never resolves a component's inputs, and keeps them in author order", () => {
    const component: IncludeEntry = {
      component: "gitlab.com/components/danger@1.0",
      inputs: { job_name: "danger", stage: "test" },
    };

    expect(parse(includeText(component)).include).toStrictEqual({
      component: "gitlab.com/components/danger@1.0",
      inputs: { job_name: "danger", stage: "test" },
    });
  });
});
