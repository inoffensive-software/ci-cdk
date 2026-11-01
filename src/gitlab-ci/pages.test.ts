import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic, type Value } from "../core/index.js";
import { type Job, type Pipeline, job, pipeline, render, toDoc } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

/** One job, so each field reads as the body it produces rather than as a whole document. */
const body = (fields: Omit<Job, "name">): Readonly<Record<string, Value>> =>
  parse(bare(pipeline({ jobs: [job({ name: "build", ...fields })] }))).build;

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

describe("job pages", () => {
  it("writes a boolean as a scalar flag", () => {
    expect(body({ pages: true })).toStrictEqual({ pages: true });
    expect(bare(pipeline({ jobs: [job({ name: "build", pages: true })] }))).toContain(
      "  pages: true\n",
    );
  });

  it("writes the map in GitLab's documented order", () => {
    const text = bare(
      pipeline({
        jobs: [
          job({
            name: "build",
            // Deliberately out of order: the fixed order wins over the author's property order.
            pages: { expire_in: "1 week", path_prefix: "docs", publish: "public" },
          }),
        ],
      }),
    );

    expect(parse(text).build).toStrictEqual({
      pages: { publish: "public", path_prefix: "docs", expire_in: "1 week" },
    });
    expect(text).toContain(
      "  pages:\n    publish: public\n    path_prefix: docs\n    expire_in: 1 week\n",
    );
  });

  it("emits only the map keys that are present", () => {
    expect(body({ pages: { publish: "public" } })).toStrictEqual({ pages: { publish: "public" } });
    expect(body({ pages: {} })).toStrictEqual({ pages: {} });
  });

  it("emits nothing when pages is absent", () => {
    expect(body({ script: "true" })).toStrictEqual({ script: "true" });
  });
});

describe("job pages placement", () => {
  it("sits after artifacts and before the keys that follow it", () => {
    const parsed = parse(
      bare(
        pipeline({
          jobs: [
            job({
              name: "build",
              artifacts: { paths: ["public/"] },
              pages: true,
              dependencies: [],
              before_script: "echo before",
            }),
          ],
        }),
      ),
    );

    expect(Object.keys(parsed.build)).toStrictEqual([
      "artifacts",
      "pages",
      "dependencies",
      "before_script",
    ]);
  });

  it("collides with raw", () => {
    const refused = pipeline({
      jobs: [job({ name: "build", pages: true, raw: { pages: { publish: "public" } } })],
    });

    expect(diagnosticsOf(() => toDoc(refused)).map((item) => item.path)).toStrictEqual([
      '$.jobs[0].raw["pages"]',
    ]);
  });
});

describe("job pages golden", () => {
  it("pins a job body with pages in its fixed position", async () => {
    const text = bare(
      pipeline({
        stages: ["deploy"],
        jobs: [
          job({
            name: "deploy",
            stage: "deploy",
            script: ["npm run build"],
            artifacts: { paths: ["public/"] },
            pages: { publish: "public", path_prefix: "site", expire_in: "1 month" },
          }),
        ],
      }),
    );

    await expect(text).toMatchFileSnapshot("__snapshots__/job-pages.yml");
  });
});
