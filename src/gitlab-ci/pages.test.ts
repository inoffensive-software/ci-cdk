import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { type PagesJob, type Pipeline, job, pipeline, render, toDoc } from "./index.js";

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

/** Every field the vocabulary models, so the pages body exercises the whole job grammar. */
const FULL_PAGES: PagesJob = {
  stage: "deploy",
  extends: [".pages-base", ".setup"],
  needs: ["build", { job: "test", optional: true, artifacts: false }],
  rules: [
    { if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH" },
    { changes: { paths: ["public/**/*"], compare_to: "main" }, when: "always" },
  ],
  tags: ["pages"],
  image: { name: "node:24", entrypoint: [""], pull_policy: "if-not-present" },
  services: ["docker:24.0.7-dind"],
  variables: { PAGES_DIR: "public" },
  cache: {
    key: { files: ["package-lock.json"], prefix: "pages-" },
    paths: [".npm"],
    policy: "pull",
    when: "on_success",
    fallback_keys: ["pages-main"],
    untracked: true,
  },
  artifacts: {
    paths: ["public/"],
    exclude: ["public/tmp/"],
    name: "pages-$CI_COMMIT_SHA",
    expire_in: "1 week",
    expose_as: "pages",
    public: true,
    when: "always",
    reports: { junit: "report.xml" },
  },
  before_script: ["npm ci"],
  script: ["npm run build"],
  after_script: "echo done",
  environment: {
    name: "production",
    url: "$CI_PAGES_URL",
    action: "start",
    on_stop: "stop-pages",
    auto_stop_in: "1 week",
    deployment_tier: "production",
  },
  release: {
    tag_name: "$CI_COMMIT_TAG",
    description: "Pages release",
    name: "pages-$CI_COMMIT_TAG",
    ref: "main",
    milestones: ["v1.0"],
    released_at: "2026-01-01T00:00:00Z",
  },
  trigger: { project: "group/child", branch: "main", strategy: "depend" },
  parallel: { matrix: [{ BROWSER: "chrome" }] },
  retry: { max: 2, when: ["runner_system_failure"], exit_codes: [137] },
  timeout: "1h",
  interruptible: true,
  allow_failure: { exit_codes: [1] },
  when: "on_success",
  resource_group: "pages",
  coverage: "/Coverage: \\d+\\.\\d+/",
};

const fullPipeline = (): Pipeline =>
  pipeline({
    stages: ["build", "deploy"],
    pages: FULL_PAGES,
    jobs: [job({ name: "build", stage: "build", script: "make" })],
  });

const pagesText = (value: Pipeline): string => render(value, { header: "" });

describe("pipeline pages", () => {
  it("writes the documented job body under the root pages key", () => {
    const pages = parse(pagesText(fullPipeline())).pages;

    expect(pages).toStrictEqual(FULL_PAGES);
  });

  it("writes the body in the job key order, independent of struct order", () => {
    const text = pagesText(
      pipeline({
        pages: {
          script: "npm run build",
          stage: "deploy",
          tags: ["pages"],
          needs: [],
          extends: ".pages-base",
        },
        stages: ["deploy"],
        jobs: [],
      }),
    );

    expect(Object.keys(parse(text).pages)).toStrictEqual([
      "stage",
      "extends",
      "needs",
      "tags",
      "script",
    ]);
  });

  it("places pages between the templates and the jobs", () => {
    const text = pagesText(
      pipeline({
        stages: ["deploy"],
        templates: { ".setup": { script: ["npm ci"] } },
        pages: { stage: "deploy", script: "npm run build" },
        jobs: [job({ name: "build", stage: "deploy", script: "make" })],
        raw: { badge: "pipeline" },
      }),
    );

    expect(Object.keys(parse(text))).toStrictEqual(["stages", ".setup", "pages", "build", "badge"]);
  });
});

describe("pipeline pages absence", () => {
  it("emits no pages key when the pipeline omits the block", () => {
    const text = pagesText(pipeline({ jobs: [job({ name: "build", script: "make" })] }));

    expect(Object.keys(parse(text))).toStrictEqual(["build"]);
  });

  it("omits absent fields rather than writing empty ones", () => {
    const text = pagesText(pipeline({ pages: { script: "true" }, jobs: [] }));

    expect(parse(text).pages).toStrictEqual({ script: "true" });
  });
});

describe("pipeline pages collisions", () => {
  it("refuses raw pages even when the pipeline omits the field", () => {
    const declared = pipeline({
      pages: { script: "true" },
      jobs: [],
      raw: { pages: { script: "false" } },
    });

    const absent = pipeline({ jobs: [], raw: { pages: { script: "false" } } });

    const expected = [
      { path: '$.raw["pages"]', message: 'raw key "pages" is already emitted at this level' },
    ];

    expect(
      diagnosticsOf(() => toDoc(declared)).map(({ path, message }) => ({ path, message })),
    ).toStrictEqual(expected);

    expect(
      diagnosticsOf(() => toDoc(absent)).map(({ path, message }) => ({ path, message })),
    ).toStrictEqual(expected);
  });

  it("refuses a job that names itself pages", () => {
    const refused = pipeline({ jobs: [job({ name: "pages", script: "true" })] });

    expect(diagnosticsOf(() => toDoc(refused)).map(({ path }) => path)).toStrictEqual([
      "$.jobs[0].name",
    ]);
  });
});

describe("pipeline pages golden", () => {
  it("pins the body's bytes", async () => {
    await expect(pagesText(fullPipeline())).toMatchFileSnapshot("__snapshots__/format-pages.yml");
  });
});
