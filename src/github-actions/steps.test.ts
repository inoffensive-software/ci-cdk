import { describe, expect, it } from "vitest";

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
