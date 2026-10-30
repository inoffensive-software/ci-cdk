import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Job, type Step, type Workflow, job, render, step, workflow } from "./index.js";

const build = (id: string, run: string): Job =>
  job({
    id,
    "runs-on": "ubuntu-latest",
    steps: [step({ run })],
  });

const smallest = (): Workflow =>
  workflow({
    name: "CI",
    on: "push",
    jobs: [build("build", "npm test")],
  });

const shellStep = (run: string): Step => step({ run });

const withRun = (run: string): Workflow =>
  workflow({
    name: "CI",
    on: "push",
    jobs: [build("build", run)],
  });

describe("render", () => {
  it("pins the smallest workflow", async () => {
    await expect(render(smallest())).toMatchFileSnapshot("__snapshots__/smallest-workflow.yml");
  });

  it("uses the job id as the map key and never inside the body", () => {
    const text = render(smallest(), { header: "" });

    expect(text).toBe(
      "name: CI\n" +
        "on: push\n" +
        "jobs:\n" +
        "  build:\n" +
        "    runs-on: ubuntu-latest\n" +
        "    steps:\n" +
        "      - run: |-\n" +
        "          npm test\n",
    );
  });

  it("emits jobs in array order", () => {
    const text = render(
      workflow({
        name: "CI",
        on: "push",
        jobs: [build("zulu", "npm test"), build("alpha", "npm test")],
      }),
      { header: "" },
    );

    expect(text.indexOf("  zulu:")).toBeLessThan(text.indexOf("  alpha:"));
  });
});

describe("declared order", () => {
  it("does not depend on the order the properties were written", () => {
    const defined = workflow({
      name: "CI",
      on: "push",
      jobs: [build("build", "npm test")],
    });

    const reordered = workflow({
      jobs: [
        job({
          steps: [step({ run: "npm test" })],
          "runs-on": "ubuntu-latest",
          id: "build",
        }),
      ],
      on: "push",
      name: "CI",
    });

    expect(render(reordered, { header: "" })).toBe(render(defined, { header: "" }));
  });
});

describe("shell text", () => {
  it("keeps a run string's newlines and relative indentation", () => {
    const run = "if [ -f pnpm-lock.yaml ]; then\n  pnpm install --frozen-lockfile\nfi";

    const text = render(withRun(run), { header: "" });

    expect(text).toContain(
      "      - run: |-\n" +
        "          if [ -f pnpm-lock.yaml ]; then\n" +
        "            pnpm install --frozen-lockfile\n" +
        "          fi\n",
    );
    expect(parse(text)).toStrictEqual({
      name: "CI",
      on: "push",
      jobs: { build: { "runs-on": "ubuntu-latest", steps: [{ run }] } },
    });
  });
});

describe("builders", () => {
  it("returns their input unchanged", () => {
    const built = shellStep("npm test");
    const builtJob = job({ id: "build", "runs-on": "ubuntu-latest", steps: [built] });
    const builtWorkflow = workflow({ name: "CI", on: "push", jobs: [builtJob] });

    expect(step(built)).toBe(built);
    expect(job(builtJob)).toBe(builtJob);
    expect(workflow(builtWorkflow)).toBe(builtWorkflow);
  });
});
