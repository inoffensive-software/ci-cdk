import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { Dirent } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { job, render, step, workflow } from "../../src/github-actions/index.js";
import {
  job as gitlabJob,
  pipeline as gitlabPipeline,
  render as gitlabRender,
} from "@inoffensive/ci-cdk/gitlab-ci";
import { INVENTORY } from "../corpus/gitlab-ci/inventory.js";
import { problemsFor, type SchemaProblem } from "./validate.js";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

interface Fixture {
  /** Repository-relative path, so a failure names the file a reviewer can open. */
  readonly path: string;
  /** The provider directory whose vendored schema the fixture is checked against. */
  readonly provider: string;
}

const ymlFiles = (dir: string): readonly string[] =>
  existsSync(dir)
    ? readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith(".yml"))
        .map((entry) => entry.name)
        .toSorted()
    : [];

/**
 * Providers with a vendored schema. A provider can exist before its schema does, and a golden can
 * only be checked against a schema that exists.
 */
const SCHEMA_PROVIDERS = new Set(
  readdirSync(join(ROOT, "test", "schemas"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.slice(0, -".json".length)),
);

/** Emitted goldens, one directory per provider under `src/<provider>/__snapshots__`. */
const snapshotFixtures = (): readonly Fixture[] =>
  readdirSync(join(ROOT, "src"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SCHEMA_PROVIDERS.has(entry.name))
    .flatMap((entry) =>
      ymlFiles(join(ROOT, "src", entry.name, "__snapshots__")).map((file) => ({
        path: `src/${entry.name}/__snapshots__/${file}`,
        provider: entry.name,
      })),
    );

/**
 * Pinned real-world configs, added one provider directory at a time. A provider's corpus is only
 * checkable once its schema is vendored, so a corpus directory without one is skipped for the same
 * reason a provider without a schema has no goldens here.
 */
const corpusFixtures = (): readonly Fixture[] =>
  readdirSync(join(ROOT, "test", "corpus"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && SCHEMA_PROVIDERS.has(entry.name))
    .flatMap((entry) =>
      ymlFiles(join(ROOT, "test", "corpus", entry.name)).map((file) => ({
        path: `test/corpus/${entry.name}/${file}`,
        provider: entry.name,
      })),
    );

/** The repository's own pipelines: generated from the DSL, and as much a fixture as the goldens. */
const pipelineFixtures = (): readonly Fixture[] =>
  ymlFiles(join(ROOT, ".github", "workflows")).map((file) => ({
    path: `.github/workflows/${file}`,
    provider: "github-actions",
  }));

const fixtures = (): readonly Fixture[] =>
  [...snapshotFixtures(), ...corpusFixtures(), ...pipelineFixtures()].toSorted((left, right) =>
    left.path.localeCompare(right.path),
  );

const problemsOf = (fixture: Fixture): readonly SchemaProblem[] =>
  problemsFor(fixture.provider, readFileSync(join(ROOT, fixture.path), "utf8"));

const described = (problems: readonly SchemaProblem[]): readonly string[] =>
  problems.map((problem) => `${problem.path} ${problem.message}`);

/**
 * The raw escape hatch exists so a key the vocabulary does not model can still be emitted, which
 * makes this golden the fixture the schema must reject: it carries `custom-key`, which GitHub does
 * not define. Everything else the library emits is expected to conform.
 */
const RAW_FIXTURE = "src/github-actions/__snapshots__/raw-shape.yml";

/**
 * A file-based negative is a checked-in fixture whose only flaw is a property the provider's schema
 * does not model. Bitbucket has no such fixture: its schema accepts unknown keys at the root, on a
 * step and on a stage, which are the only levels `raw` can write. Its negative is therefore a
 * synthetic document, asserted below rather than discovered from disk.
 */
const FILE_NEGATIVE_FIXTURES: readonly Fixture[] = [
  { path: RAW_FIXTURE, provider: "github-actions" },
];

const FILE_NEGATIVE_PATHS: readonly string[] = FILE_NEGATIVE_FIXTURES.map(({ path }) => path);

/** Not a repository path: the document exists only in this test. */
const BITBUCKET_NEGATIVE_NAME = "synthetic:bitbucket-pipelines/item-with-sibling-key.yml";

/**
 * A pipeline item carrying a `step` plus a sibling key. Each part is valid Bitbucket; the item map
 * does not allow any key beside `step`, `parallel`, `stage` or `final`, so this is the narrowest
 * document the pinned schema rejects.
 */
const bitbucketNegative = (): string =>
  [
    "pipelines:",
    "  default:",
    "    - step:",
    "        script:",
    "          - npm test",
    "      not-a-bitbucket-item-key: true",
    "",
  ].join("\n");

/** A workflow whose only flaw is a `raw` key no schema knows, built through the public API. */
const unmodelledRaw = (): string =>
  render(
    workflow({
      name: "CI",
      on: "push",
      jobs: [
        job({
          id: "build",
          "runs-on": "ubuntu-latest",
          steps: [step({ run: "npm test" })],
          raw: { "not-a-github-key": true },
        }),
      ],
    }),
    { header: "" },
  );

/** A pipeline whose only flaw is a `raw` job key no GitLab schema knows, built through the public API. */
const unmodelledGitlabRaw = (): string =>
  gitlabRender(
    gitlabPipeline({
      jobs: [
        gitlabJob({
          name: "build",
          stage: "build",
          script: "npm ci",
          raw: { "not-a-gitlab-key": true },
        }),
      ],
    }),
    { header: "" },
  );

const remoteReferences = (schema: string): readonly string[] =>
  [...schema.matchAll(/"\$ref":\s*"([^"]+)"/gu)].flatMap((match) => {
    const reference = match[1] ?? "";

    return reference.startsWith("#/") ? [] : [reference];
  });

/** Every schema problem across the GitLab inventory, named by the inventory document that caused it. */
const gitlabInventoryProblems = (): readonly string[] =>
  INVENTORY.flatMap((document) =>
    problemsFor("gitlab-ci", gitlabRender(document.pipeline, { header: "" })).map(
      (problem) => `${document.name}: ${problem.path} ${problem.message}`,
    ),
  );

/** Every vendored schema, so the reference check cannot silently narrow to one provider. */
const schemaFiles = (): readonly string[] =>
  readdirSync(join(ROOT, "test", "schemas"), { withFileTypes: true })
    .filter((entry: Dirent) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry: Dirent) => entry.name)
    .toSorted();

const ALL = fixtures();
const VALID = ALL.filter((fixture) => !FILE_NEGATIVE_PATHS.includes(fixture.path));

describe("schema conformance", () => {
  it("checks the provider goldens as well as any corpus config", () => {
    expect(snapshotFixtures().length).toBeGreaterThan(0);
    expect(VALID.length).toBeGreaterThan(0);
  });

  it.each([...VALID])("$path", (fixture: Fixture) => {
    expect(described(problemsOf(fixture))).toStrictEqual([]);
  });

  it("declares exactly the fixtures that must fail", () => {
    const invalid = ALL.filter((fixture) => problemsOf(fixture).length > 0).map(({ path }) => path);

    expect(invalid).toStrictEqual([...FILE_NEGATIVE_PATHS].toSorted());
  });
});

describe("declared negative fixtures", () => {
  it("rejects the fixture carrying an unmodelled key through raw", () => {
    const problems = described(problemsOf({ path: RAW_FIXTURE, provider: "github-actions" }));

    expect(problems).toContain(
      '/jobs/build/steps/0 must NOT have additional properties: "custom-key"',
    );
  });

  it("rejects a synthetic Bitbucket item carrying a key beside step", () => {
    const problems = described(problemsFor("bitbucket-pipelines", bitbucketNegative()));

    expect(problems).toContain(
      '/pipelines/default/0 must NOT have additional properties: "not-a-bitbucket-item-key"',
    );
  });

  it("does not treat the synthetic Bitbucket negative as a fixture", () => {
    const onDisk = ALL.map(({ path }) => readFileSync(join(ROOT, path), "utf8"));

    expect(onDisk).not.toContain(bitbucketNegative());
    expect(ALL.map(({ path }) => path)).not.toContain(BITBUCKET_NEGATIVE_NAME);
  });

  it("rejects a document carrying an unmodelled key through raw", () => {
    const problems = described(problemsFor("github-actions", unmodelledRaw()));

    expect(problems).toContain(
      '/jobs/build must NOT have additional properties: "not-a-github-key"',
    );
  });

  it("rejects a GitLab document carrying an unmodelled key through raw", () => {
    const problems = described(problemsFor("gitlab-ci", unmodelledGitlabRaw()));

    expect(problems).toContain('/build must NOT have additional properties: "not-a-gitlab-key"');
  });
});

describe("gitlab inventory", () => {
  it("validates every document", () => {
    expect(INVENTORY.length).toBeGreaterThan(0);
    expect(gitlabInventoryProblems()).toStrictEqual([]);
  });
});

describe("vendored schemas", () => {
  it("are self-contained with no remote references", () => {
    const files = schemaFiles();

    expect(files.length).toBeGreaterThanOrEqual(2);

    const references = files.flatMap((file) => {
      const schema = readFileSync(join(ROOT, "test", "schemas", file), "utf8");

      return remoteReferences(schema).map((reference) => `${file}: ${reference}`);
    });

    expect(references).toStrictEqual([]);
  });
});
