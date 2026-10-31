import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic, type Value } from "../core/index.js";
import { job, pipeline, render, toDoc } from "./index.js";
import type { Default, Job, Pipeline } from "./types.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

/** One job, so each field reads as the body it produces rather than as a whole document. */
const body = (fields: Omit<Job, "name">): Readonly<Record<string, Value>> =>
  parse(bare(pipeline({ jobs: [job({ name: "build", ...fields })] }))).build;

const defaultBody = (defaults: Default): Readonly<Record<string, Value>> =>
  parse(bare(pipeline({ default: defaults, jobs: [] }))).default;

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

describe("inherit", () => {
  it("writes the default and variables selectors", () => {
    const inherit = { default: ["image", "cache"], variables: ["DEPLOY", "REGION"] } as const;

    expect(body({ inherit })["inherit"]).toStrictEqual(inherit);
  });

  it("keeps a boolean selector a boolean", () => {
    expect(body({ inherit: { default: false } })["inherit"]).toStrictEqual({ default: false });
    expect(body({ inherit: { variables: true } })["inherit"]).toStrictEqual({ variables: true });
  });

  it("emits only the selector it was given", () => {
    expect(body({ inherit: { variables: false } })["inherit"]).toStrictEqual({ variables: false });
  });
});

describe("hooks", () => {
  it("writes the pre-get-sources script as one command", () => {
    expect(
      body({ hooks: { pre_get_sources_script: "git submodule update" } })["hooks"],
    ).toStrictEqual({ pre_get_sources_script: "git submodule update" });
  });

  it("writes the pre-get-sources script as a list", () => {
    expect(
      body({ hooks: { pre_get_sources_script: ["echo one", "echo two"] } })["hooks"],
    ).toStrictEqual({ pre_get_sources_script: ["echo one", "echo two"] });
  });

  it("writes hooks under default", () => {
    expect(defaultBody({ hooks: { pre_get_sources_script: ["echo one"] } })["hooks"]).toStrictEqual(
      { pre_get_sources_script: ["echo one"] },
    );
  });
});

describe("dependencies", () => {
  it("writes the job-name list in order", () => {
    expect(body({ dependencies: ["build", "lint"] })["dependencies"]).toStrictEqual([
      "build",
      "lint",
    ]);
  });

  it("keeps an empty list, which downloads no artifacts", () => {
    expect(body({ dependencies: [] })["dependencies"]).toStrictEqual([]);
  });
});

describe("delayed and manual jobs", () => {
  it("writes start_in as GitLab's duration text", () => {
    expect(body({ when: "delayed", start_in: "1 hour" })).toStrictEqual({
      when: "delayed",
      start_in: "1 hour",
    });
  });

  it("writes the manual confirmation text", () => {
    expect(body({ when: "manual", manual_confirmation: "Ship it?" })).toStrictEqual({
      when: "manual",
      manual_confirmation: "Ship it?",
    });
  });
});

describe("dast_configuration", () => {
  it("writes the site and scanner profiles in documented order", () => {
    expect(
      body({ dast_configuration: { site_profile: "site", scanner_profile: "scan" } }),
    ).toStrictEqual({
      dast_configuration: { site_profile: "site", scanner_profile: "scan" },
    });
  });
});

describe("small deferred keys are absent unless given", () => {
  it("emits no key for any of them", () => {
    expect(body({ script: "true" })).toStrictEqual({ script: "true" });
    expect(defaultBody({ image: "alpine:3.20" })).toStrictEqual({ image: "alpine:3.20" });
  });
});

describe("small deferred keys collide with raw", () => {
  it("refuses each modelled key in a job's raw", () => {
    const refused = pipeline({
      jobs: [
        job({
          name: "build",
          script: "true",
          raw: {
            dependencies: ["prep"],
            inherit: { variables: false },
            hooks: { pre_get_sources_script: "echo pre" },
            start_in: "1 hour",
            manual_confirmation: "Ship it?",
            dast_configuration: { site_profile: "site", scanner_profile: "scan" },
          },
        }),
      ],
    });

    expect(diagnosticsOf(() => toDoc(refused)).map((item) => item.path)).toStrictEqual([
      '$.jobs[0].raw["dependencies"]',
      '$.jobs[0].raw["inherit"]',
      '$.jobs[0].raw["hooks"]',
      '$.jobs[0].raw["start_in"]',
      '$.jobs[0].raw["manual_confirmation"]',
      '$.jobs[0].raw["dast_configuration"]',
    ]);
  });
});

describe("small deferred key emission order", () => {
  it("places each key at its slot in the fixed job order", () => {
    const parsed = parse(
      bare(
        pipeline({
          jobs: [
            job({
              name: "build",
              script: "true",
              inherit: { variables: false },
              dependencies: ["prep"],
              hooks: { pre_get_sources_script: "echo pre" },
              dast_configuration: { site_profile: "site", scanner_profile: "scan" },
              when: "delayed",
              start_in: "1 hour",
              manual_confirmation: "Ship it?",
            }),
          ],
        }),
      ),
    );

    expect(Object.keys(parsed.build)).toStrictEqual([
      "inherit",
      "dependencies",
      "hooks",
      "dast_configuration",
      "script",
      "when",
      "start_in",
      "manual_confirmation",
    ]);
  });
});
