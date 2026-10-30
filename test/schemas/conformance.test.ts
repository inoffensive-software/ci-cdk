import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { job, render, step, workflow } from "../../src/github-actions/index.js";
import { problemsFor, type SchemaProblem } from "./validate.js";

const root = fileURLToPath(new URL("../..", import.meta.url));

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
const schemaProviders = new Set(
  readdirSync(join(root, "test", "schemas"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name.slice(0, -".json".length)),
);

/** Emitted goldens, one directory per provider under `src/<provider>/__snapshots__`. */
const snapshotFixtures = (): readonly Fixture[] =>
  readdirSync(join(root, "src"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && schemaProviders.has(entry.name))
    .flatMap((entry) =>
      ymlFiles(join(root, "src", entry.name, "__snapshots__")).map((file) => ({
        path: `src/${entry.name}/__snapshots__/${file}`,
        provider: entry.name,
      })),
    );

/** Pinned real-world configs, added one provider directory at a time. */
const corpusFixtures = (): readonly Fixture[] =>
  readdirSync(join(root, "test", "corpus"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) =>
      ymlFiles(join(root, "test", "corpus", entry.name)).map((file) => ({
        path: `test/corpus/${entry.name}/${file}`,
        provider: entry.name,
      })),
    );

/** The repository's own pipelines: generated from the DSL, and as much a fixture as the goldens. */
const pipelineFixtures = (): readonly Fixture[] =>
  ymlFiles(join(root, ".github", "workflows")).map((file) => ({
    path: `.github/workflows/${file}`,
    provider: "github-actions",
  }));

const fixtures = (): readonly Fixture[] =>
  [...snapshotFixtures(), ...corpusFixtures(), ...pipelineFixtures()].toSorted((left, right) =>
    left.path.localeCompare(right.path),
  );

const problemsOf = (fixture: Fixture): readonly SchemaProblem[] =>
  problemsFor(fixture.provider, readFileSync(join(root, fixture.path), "utf8"));

const described = (problems: readonly SchemaProblem[]): readonly string[] =>
  problems.map((problem) => `${problem.path} ${problem.message}`);

/**
 * The raw escape hatch exists so a key the vocabulary does not model can still be emitted, which
 * makes this golden the fixture the schema must reject: it carries `custom-key`, which GitHub does
 * not define. Everything else the library emits is expected to conform.
 */
const rawFixture = "src/github-actions/__snapshots__/raw-shape.yml";

const negativeFixtures: readonly string[] = [rawFixture];

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

const remoteReferences = (schema: string): readonly string[] =>
  [...schema.matchAll(/"\$ref":\s*"([^"]+)"/gu)].flatMap((match) => {
    const reference = match[1] ?? "";

    return reference.startsWith("#/") ? [] : [reference];
  });

const all = fixtures();
const valid = all.filter((fixture) => !negativeFixtures.includes(fixture.path));

describe("schema conformance", () => {
  it("checks the provider goldens as well as any corpus config", () => {
    expect(snapshotFixtures().length).toBeGreaterThan(0);
    expect(valid.length).toBeGreaterThan(0);
  });

  it.each([...valid])("$path", (fixture: Fixture) => {
    expect(described(problemsOf(fixture))).toStrictEqual([]);
  });

  it("declares exactly the fixtures that must fail", () => {
    const invalid = all.filter((fixture) => problemsOf(fixture).length > 0).map(({ path }) => path);

    expect(invalid).toStrictEqual([...negativeFixtures].toSorted());
  });

  it("rejects the fixture carrying an unmodelled key through raw", () => {
    const problems = described(problemsOf({ path: rawFixture, provider: "github-actions" }));

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

  it("vendors a self-contained schema with no remote references", () => {
    const schema = readFileSync(join(root, "test", "schemas", "github-actions.json"), "utf8");

    expect(remoteReferences(schema)).toStrictEqual([]);
  });
});
