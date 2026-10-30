import { describe, expect, it } from "vitest";

import { job, render, step, workflow } from "./index.js";

const STEPS = [step({ run: "npm test" })];

type Concurrency = NonNullable<Parameters<typeof workflow>[0]["concurrency"]>;

const renderWorkflow = (concurrency: Concurrency): string =>
  render(
    workflow({
      name: "CI",
      on: "push",
      concurrency,
      jobs: [job({ id: "build", "runs-on": "ubuntu-latest", steps: STEPS })],
    }),
    { header: "" },
  );

describe("concurrency queue", () => {
  it("emits the workflow-level queue after cancel-in-progress", () => {
    const text = renderWorkflow({ group: "ci-main", "cancel-in-progress": false, queue: "max" });

    expect(text).toContain(
      "concurrency:\n  group: ci-main\n  cancel-in-progress: false\n  queue: max\n",
    );
  });

  it("emits the job-level queue after cancel-in-progress", () => {
    const text = render(
      workflow({
        name: "CI",
        on: "push",
        jobs: [
          job({
            id: "build",
            "runs-on": "ubuntu-latest",
            concurrency: { group: "build", "cancel-in-progress": false, queue: "single" },
            steps: STEPS,
          }),
        ],
      }),
      { header: "" },
    );

    expect(text).toContain(
      "    concurrency:\n      group: build\n      cancel-in-progress: false\n      queue: single\n",
    );
  });
});
