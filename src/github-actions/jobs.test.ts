import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Job, expr, job, needs, render, step, workflow } from "./index.js";

const build = (overrides: Partial<Job> = {}): Job =>
  job({
    id: "build",
    "runs-on": "ubuntu-latest",
    steps: [step({ run: "npm test" })],
    ...overrides,
  });

const withJobs = (jobs: readonly Job[]): string =>
  render(workflow({ name: "CI", on: "push", jobs }), { header: "" });

describe("runs-on", () => {
  it("keeps a single label a scalar", () => {
    expect(withJobs([build({ "runs-on": "self-hosted" })])).toContain("    runs-on: self-hosted\n");
  });

  it("lowers a label set to a sequence", () => {
    expect(withJobs([build({ "runs-on": ["self-hosted", "linux", "x64"] })])).toContain(
      "    runs-on:\n      - self-hosted\n      - linux\n      - x64\n",
    );
  });

  it("accepts an expression leaf and emits it double-quoted", () => {
    expect(withJobs([build({ "runs-on": expr`matrix.os` })])).toContain(
      '    runs-on: "${{ matrix.os }}"\n',
    );
  });
});

describe("needs", () => {
  it("keeps a single id a scalar", () => {
    const text = withJobs([build(), build({ id: "test", needs: "build" })]);

    expect(parse(text)).toMatchObject({ jobs: { test: { needs: "build" } } });
    expect(text).toContain("    needs: build\n");
  });

  it("keeps several ids a sequence", () => {
    const text = withJobs([
      build(),
      build({ id: "test", needs: "build" }),
      build({ id: "deploy", needs: ["build", "test"] }),
    ]);

    expect(parse(text)).toMatchObject({ jobs: { deploy: { needs: ["build", "test"] } } });
  });

  it("does not collapse a one-element array to a scalar", () => {
    const text = withJobs([build(), build({ id: "test", needs: ["build"] })]);

    expect(text).toContain("    needs:\n      - build\n");
    expect(text).not.toContain("    needs: build\n");
  });
});

describe("job condition", () => {
  it("leaves a plain condition unquoted", () => {
    const text = withJobs([build({ if: "github.ref == 'refs/heads/main'" })]);

    expect(text).toContain("    if: github.ref == 'refs/heads/main'\n");
  });

  it("quotes an expression condition", () => {
    const text = withJobs([build({ if: expr`github.ref == 'refs/heads/main'` })]);

    expect(text).toContain("    if: \"${{ github.ref == 'refs/heads/main' }}\"\n");
  });
});

describe("strategy", () => {
  it("emits each matrix element with its own type", () => {
    const text = withJobs([
      build({
        strategy: {
          matrix: {
            "node-version": [20, 22],
            experimental: [true, false],
            os: ["ubuntu-latest"],
          },
        },
      }),
    ]);

    expect(parse(text)).toMatchObject({
      jobs: {
        build: {
          strategy: {
            matrix: {
              "node-version": [20, 22],
              experimental: [true, false],
              os: ["ubuntu-latest"],
            },
          },
        },
      },
    });
    expect(text).toContain("        node-version:\n          - 20\n          - 22\n");
    expect(text).toContain("        experimental:\n          - true\n          - false\n");
    expect(text).not.toContain('"20"');
  });

  it("emits fail-fast and max-parallel unquoted", () => {
    const text = withJobs([build({ strategy: { "fail-fast": false, "max-parallel": 2 } })]);

    expect(text).toContain("      fail-fast: false\n");
    expect(text).toContain("      max-parallel: 2\n");
  });
});

describe("job fields", () => {
  it("emits name and outputs, preserving output order", () => {
    const text = withJobs([
      build({
        name: "Build",
        outputs: { digest: needs("build", "digest"), url: needs("build", "url") },
      }),
    ]);

    expect(text).toContain("    name: Build\n");
    expect(text.indexOf("digest:")).toBeLessThan(text.indexOf("url:"));
  });
});

describe("declared job order", () => {
  it("emits the fixed order whatever order the properties were written", () => {
    const prepare = build({ id: "prepare" });

    const defined = build({
      name: "Build",
      needs: "prepare",
      if: "success()",
      outputs: { digest: "abc" },
      strategy: { "fail-fast": false },
    });

    const reordered = build({
      strategy: { "fail-fast": false },
      outputs: { digest: "abc" },
      if: "success()",
      needs: "prepare",
      name: "Build",
    });

    const rendered = render(workflow({ name: "CI", on: "push", jobs: [prepare, reordered] }));

    expect(rendered).toContain(
      "  build:\n" +
        "    name: Build\n" +
        "    needs: prepare\n" +
        "    if: success()\n" +
        "    runs-on: ubuntu-latest\n" +
        "    strategy:\n" +
        "      fail-fast: false\n" +
        "    outputs:\n" +
        "      digest: abc\n" +
        "    steps:\n" +
        "      - run: |-\n" +
        "          npm test\n",
    );
    expect(rendered).toBe(render(workflow({ name: "CI", on: "push", jobs: [prepare, defined] })));
  });
});

describe("job graph golden", () => {
  it("pins a three-job workflow with a needs chain and a two-axis matrix", async () => {
    const graph = workflow({
      name: "CI",
      on: "push",
      jobs: [
        build(),
        build({
          id: "test",
          needs: "build",
          strategy: {
            matrix: {
              "node-version": [20, 22],
              os: ["ubuntu-latest", "macos-latest"],
            },
          },
        }),
        build({
          id: "deploy",
          name: "Deploy",
          needs: ["build", "test"],
          if: expr`github.ref == 'refs/heads/main'`,
          outputs: { digest: needs("test", "digest") },
        }),
      ],
    });

    await expect(render(graph)).toMatchFileSnapshot("__snapshots__/job-graph.yml");
  });
});
