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
      inputs: { zulu: "last", alpha: "first" },
    };

    const text = includeText(component);

    expect(parse(text).include).toStrictEqual(component);
    expect(text.indexOf("zulu:")).toBeLessThan(text.indexOf("alpha:"));
  });
});

describe("include inputs", () => {
  it("accepts inputs on every source, scalar and object alike", () => {
    const cases: readonly IncludeEntry[] = [
      { local: "ci.yml", inputs: { env: "staging" } },
      { remote: "https://example.com/ci.yml", inputs: { env: { value: "staging" } } },
      { template: "Nodejs.gitlab-ci.yml", inputs: { env: ["staging", "production"] } },
      {
        project: "group/project",
        file: "ci.yml",
        inputs: { env: { value: "staging", expand: false, description: "target" } },
      },
      { component: "gitlab.com/components/danger@1.0", inputs: { env: 2 } },
    ];

    for (const entry of cases) {
      expect(parse(includeText(entry)).include).toStrictEqual(entry);
    }
  });

  it("emits the object form's keys in author order", () => {
    const entry: IncludeEntry = {
      component: "gitlab.com/components/danger@1.0",
      inputs: { env: { description: "target", options: ["a"], expand: false, value: "a" } },
    };

    const text = includeText(entry);

    expect(text.indexOf("description:")).toBeLessThan(text.indexOf("options:"));
    expect(text.indexOf("options:")).toBeLessThan(text.indexOf("expand:"));
    expect(text.indexOf("expand:")).toBeLessThan(text.indexOf("value:"));
  });

  it("accepts a nested list of inputs", () => {
    const entry: IncludeEntry = {
      local: "ci.yml",
      inputs: { matrix: [[{ value: "a" }], [{ value: "b" }]] },
    };

    expect(parse(includeText(entry)).include).toStrictEqual(entry);
  });

  it("emits no inputs key when the entry omits them", () => {
    expect(parse(includeText({ local: "ci.yml" })).include).toStrictEqual({ local: "ci.yml" });
  });
});

describe("include cache", () => {
  it("writes a remote include's cache as a flag or a duration, after the source", () => {
    const entries: readonly IncludeEntry[] = [
      { remote: "https://example.com/one.yml", cache: true },
      { remote: "https://example.com/two.yml", cache: "30 minutes" },
    ];

    const text = includeText(entries);

    expect(parse(text).include).toStrictEqual(entries);
    expect(text.indexOf("remote:")).toBeLessThan(text.indexOf("cache:"));
  });

  it("keeps the cache key on the entry that carries it", () => {
    const entry: IncludeEntry = {
      remote: "https://example.com/one.yml",
      cache: "1 day",
      rules: [{ changes: { regexp: "^ci/" } }],
    };

    expect(parse(includeText(entry)).include).toStrictEqual(entry);
  });
});
