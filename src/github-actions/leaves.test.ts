import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Text } from "../core/index.js";
import {
  type Step,
  type Workflow,
  expr,
  job,
  matrix,
  needs,
  render,
  script,
  step,
  workflow,
} from "./index.js";

const withStep = (value: Step): Workflow =>
  workflow({
    name: "CI",
    on: "push",
    jobs: [job({ id: "build", "runs-on": "ubuntu-latest", steps: [value] })],
  });

const renderedEnv = (value: Text): string =>
  render(withStep(step({ env: { VALUE: value } })), { header: "" });

describe("expr", () => {
  it("pins an expression with a colon and a multi-line script in one step", async () => {
    const workflowWithExpression = withStep(
      step({
        name: "Build",
        if: expr`github.ref == 'refs/heads/main'`,
        env: { MESSAGE: expr`format('{0}: {1}', github.ref, 'main')` },
        run: script("pnpm install --frozen-lockfile\npnpm build"),
        "timeout-minutes": 10,
      }),
    );

    await expect(render(workflowWithExpression)).toMatchFileSnapshot(
      "__snapshots__/expressions-and-scripts.yml",
    );
  });

  it("quotes text so colons, comment markers and braces survive a YAML reader", () => {
    const value = expr`format('{0}: {1} # {2}', a, '{{ b }}')`;
    const text = render(withStep(step({ env: { VALUE: value } })), { header: "" });

    expect(text).toContain('VALUE: "${{ ');
    expect(parse(text)).toStrictEqual({
      name: "CI",
      on: "push",
      jobs: {
        build: {
          "runs-on": "ubuntu-latest",
          steps: [{ env: { VALUE: "${{ format('{0}: {1} # {2}', a, '{{ b }}') }}" } }],
        },
      },
    });
  });
});

describe("script", () => {
  it("keeps a shared snippet's newlines and indentation wherever it is used", () => {
    const snippet = script("set -e\n\npnpm test\n");

    const text = render(withStep(step({ run: snippet })), { header: "" });

    expect(text).toContain("      - run: |\n");
    expect(parse(text)).toStrictEqual({
      name: "CI",
      on: "push",
      jobs: {
        build: {
          "runs-on": "ubuntu-latest",
          steps: [{ run: "set -e\n\npnpm test\n" }],
        },
      },
    });
  });
});

describe("matrix and needs", () => {
  it("emits the same node shape as expr", () => {
    expect(renderedEnv(matrix("os"))).toBe(renderedEnv(expr`matrix.os`));
    expect(renderedEnv(needs("build", "digest"))).toBe(
      renderedEnv(expr`needs.build.outputs.digest`),
    );
  });

  it("emits a double-quoted expression for each", () => {
    const text = render(
      withStep(step({ env: { OS: matrix("os"), DIGEST: needs("build", "digest") } })),
      { header: "" },
    );

    expect(text).toContain('OS: "${{ matrix.os }}"');
    expect(text).toContain('DIGEST: "${{ needs.build.outputs.digest }}"');
  });
});
