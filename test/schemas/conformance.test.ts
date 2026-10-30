import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { job, render, step, workflow } from "../../src/github-actions/index.js";
import {
  job as gitlabJob,
  pipeline as gitlabPipeline,
  render as gitlabRender,
} from "../../src/gitlab-ci/index.js";
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

const NEGATIVE_FIXTURES: readonly string[] = [RAW_FIXTURE];

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

const ALL = fixtures();
const VALID = ALL.filter((fixture) => !NEGATIVE_FIXTURES.includes(fixture.path));

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

    expect(invalid).toStrictEqual([...NEGATIVE_FIXTURES].toSorted());
  });

  it("rejects the fixture carrying an unmodelled key through raw", () => {
    const problems = described(problemsOf({ path: RAW_FIXTURE, provider: "github-actions" }));

    expect(problems).toContain(
      '/jobs/build/steps/0 must NOT have additional properties: "custom-key"',
    );
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

  it("validates every GitLab inventory document", () => {
    expect(INVENTORY.length).toBeGreaterThan(0);

    const problems = INVENTORY.flatMap((document) =>
      problemsFor("gitlab-ci", gitlabRender(document.pipeline, { header: "" })).map(
        (problem) => `${document.name}: ${problem.path} ${problem.message}`,
      ),
    );

    expect(problems).toStrictEqual([]);
  });

  it("vendors a self-contained schema with no remote references", () => {
    const schema = readFileSync(join(ROOT, "test", "schemas", "github-actions.json"), "utf8");

    expect(remoteReferences(schema)).toStrictEqual([]);
  });
});
