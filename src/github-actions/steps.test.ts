import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Step, type Workflow, expr, job, render, step, workflow } from "./index.js";

const withStep = (value: Step): Workflow =>
  workflow({
    name: "CI",
    on: "push",
    jobs: [job({ id: "build", "runs-on": "ubuntu-latest", steps: [value] })],
  });

const renderStep = (value: Step): string => render(withStep(value), { header: "" });

describe("typed scalars", () => {
  it("emits timeout-minutes and continue-on-error unquoted", () => {
    const text = renderStep(step({ "timeout-minutes": 10, "continue-on-error": false }));

    expect(text).toContain("continue-on-error: false\n");
    expect(text).toContain("timeout-minutes: 10\n");
    expect(text).not.toContain('"10"');
  });

  it("accepts an expression for continue-on-error", () => {
    const text = renderStep(step({ "continue-on-error": expr`matrix.experimental` }));

    expect(text).toContain('continue-on-error: "${{ matrix.experimental }}"\n');
  });
});

describe("step fields", () => {
  it("emits a run step's fields in declared order", () => {
    const text = renderStep(
      step({
        "timeout-minutes": 10,
        "continue-on-error": false,
        env: { CI: "true" },
        shell: "bash",
        "working-directory": "app",
        run: "npm test",
        name: "Build",
        if: "success()",
        id: "build",
      }),
    );

    expect(text).toBe(
      "name: CI\n" +
        "on: push\n" +
        "jobs:\n" +
        "  build:\n" +
        "    runs-on: ubuntu-latest\n" +
        "    steps:\n" +
        "      - id: build\n" +
        "        if: success()\n" +
        "        name: Build\n" +
        "        run: |-\n" +
        "          npm test\n" +
        "        working-directory: app\n" +
        "        shell: bash\n" +
        "        env:\n" +
        '          CI: "true"\n' +
        "        continue-on-error: false\n" +
        "        timeout-minutes: 10\n",
    );
  });
});

interface ParsedStep {
  readonly background?: boolean;
  readonly cancel?: string;
  readonly parallel?: readonly ParsedStep[];
  readonly wait?: string | readonly string[];
  readonly "wait-all"?: boolean | null;
}

interface ParsedWorkflow {
  readonly jobs: { readonly build: { readonly steps: readonly ParsedStep[] } };
}

const parseStep = (text: string): ParsedStep => {
  const parsed: ParsedWorkflow = parse(text);

  return parsed.jobs.build.steps[0] ?? {};
};

describe("step concurrency", () => {
  it("emits background after the step body it starts", () => {
    const text = renderStep(step({ id: "serve", run: "npm start", background: true }));

    expect(text).toContain(
      "      - id: serve\n        run: |-\n          npm start\n        background: true\n",
    );
  });

  it("emits wait as one id and as several", () => {
    expect(renderStep(step({ wait: "serve" }))).toContain("      - wait: serve\n");
    expect(renderStep(step({ wait: ["serve", "build"] }))).toContain(
      "      - wait:\n          - serve\n          - build\n",
    );
  });

  it("emits cancel as one id", () => {
    expect(renderStep(step({ cancel: "serve" }))).toContain("      - cancel: serve\n");
  });

  it("emits a parallel group as a sequence of steps", () => {
    const text = renderStep(step({ parallel: [step({ run: "lint" }), step({ run: "test" })] }));

    expect(text).toBe(
      "name: CI\n" +
        "on: push\n" +
        "jobs:\n" +
        "  build:\n" +
        "    runs-on: ubuntu-latest\n" +
        "    steps:\n" +
        "      - parallel:\n" +
        "          - run: |-\n" +
        "              lint\n" +
        "          - run: |-\n" +
        "              test\n",
    );
  });

  it("lowers a bare wait-all to null, not false", () => {
    const text = renderStep(step({ "wait-all": null }));

    expect(text).toContain("      - wait-all: null\n");
    expect(parseStep(text)["wait-all"]).toBeNull();
  });
});

describe("conditions", () => {
  it("leaves a valid plain condition unquoted", () => {
    const condition = "github.ref == 'refs/heads/main' && !cancelled()";

    expect(renderStep(step({ if: condition }))).toContain(`if: ${condition}\n`);
  });
});

describe("step maps", () => {
  it("emits a uses step with its with map", () => {
    const text = renderStep(
      step({
        id: "checkout",
        uses: "actions/checkout@v4",
        with: { path: "packages/app" },
      }),
    );

    expect(text).toContain(
      "      - id: checkout\n" +
        "        uses: actions/checkout@v4\n" +
        "        with:\n" +
        "          path: packages/app\n",
    );
  });

  it("preserves author order in with and env", () => {
    const text = renderStep(
      step({
        uses: "actions/setup-node@v4",
        with: { zulu: "z", alpha: "a" },
        env: { ZEBRA: "z", ALPHA: "a" },
      }),
    );

    expect(text.indexOf("zulu:")).toBeLessThan(text.indexOf("alpha:"));
    expect(text.indexOf("ZEBRA:")).toBeLessThan(text.indexOf("ALPHA:"));
  });
});
