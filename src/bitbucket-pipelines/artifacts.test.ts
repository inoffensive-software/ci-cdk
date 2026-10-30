import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { type Artifacts, type PipelineConfig, pipelineConfig, render, step } from "./index.js";

interface ParsedUpload {
  readonly "capture-on"?: string;
  readonly depth?: number;
  readonly "ignore-paths"?: readonly string[];
  readonly name?: string;
  readonly paths?: readonly string[];
  readonly type?: string;
}

interface ParsedArtifacts {
  readonly download?: boolean | readonly string[];
  readonly paths?: readonly string[];
  readonly upload?: readonly ParsedUpload[];
}

interface ParsedDocument {
  readonly pipelines: {
    readonly default: readonly { readonly step: { readonly artifacts?: ParsedArtifacts } }[];
  };
}

const withArtifacts = (artifacts: Artifacts): PipelineConfig =>
  pipelineConfig({ pipelines: { default: [step({ artifacts, script: ["true"] })] } });

const parsed = (config: PipelineConfig): ParsedDocument => parse(render(config, { header: "" }));

const diagnosticsOf = (config: PipelineConfig): readonly Diagnostic[] => {
  try {
    render(config);
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics;
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

const EXPECTED_MAP = [
  "        artifacts:",
  "          download: true",
  "          paths:",
  "            - dist/**",
  "          upload:",
  "            - name: build",
  "              paths:",
  "                - dist/**",
  "                - coverage/**",
].join("\n");

const EXPECTED_OPTIONS_UPLOAD = [
  "        artifacts:",
  "          upload:",
  "            - capture-on: always",
  "              depth: 3",
  "              ignore-paths:",
  "                - node_modules/**",
  "              name: build",
  "              paths:",
  "                - dist/**",
  "              type: test-reports",
].join("\n");

describe("artifacts map form", () => {
  it("emits download, paths and upload, each upload name then paths", () => {
    const config = withArtifacts({
      download: true,
      paths: ["dist/**"],
      upload: [{ name: "build", paths: ["dist/**", "coverage/**"] }],
    });

    expect(render(config, { header: "" })).toContain(EXPECTED_MAP);
    expect(parsed(config).pipelines.default[0]?.step.artifacts).toStrictEqual({
      download: true,
      paths: ["dist/**"],
      upload: [{ name: "build", paths: ["dist/**", "coverage/**"] }],
    });
  });

  it("emits a name-list download and no key the author left absent", () => {
    const config = withArtifacts({ download: ["build", "coverage"] });

    expect(render(config, { header: "" })).toContain(
      [
        "        artifacts:",
        "          download:",
        "            - build",
        "            - coverage",
      ].join("\n"),
    );
    expect(parsed(config).pipelines.default[0]?.step.artifacts).toStrictEqual({
      download: ["build", "coverage"],
    });
  });

  it("keeps the path-list form's bytes", () => {
    const config = withArtifacts(["dist/**"]);

    expect(render(config, { header: "" })).toContain(
      ["        artifacts:", "          - dist/**"].join("\n"),
    );
  });
});

describe("artifacts upload options", () => {
  it("emits an upload's extra keys in schema order around name and paths", () => {
    const config = withArtifacts({
      upload: [
        {
          "capture-on": "always",
          depth: 3,
          "ignore-paths": ["node_modules/**"],
          name: "build",
          paths: ["dist/**"],
          type: "test-reports",
        },
      ],
    });

    expect(render(config, { header: "" })).toContain(EXPECTED_OPTIONS_UPLOAD);
    expect(parsed(config).pipelines.default[0]?.step.artifacts).toStrictEqual({
      upload: [
        {
          "capture-on": "always",
          depth: 3,
          "ignore-paths": ["node_modules/**"],
          name: "build",
          paths: ["dist/**"],
          type: "test-reports",
        },
      ],
    });
  });

  it("emits only the extra keys the author set", () => {
    const config = withArtifacts({
      upload: [{ depth: 1, name: "build", paths: ["dist/**"] }],
    });

    expect(render(config, { header: "" })).toContain(
      [
        "            - depth: 1",
        "              name: build",
        "              paths:",
        "                - dist/**",
      ].join("\n"),
    );
  });
});

describe("artifacts upload unions", () => {
  it("keeps type and capture-on closed", () => {
    const config = withArtifacts({
      upload: [
        {
          // @ts-expect-error an upload type is one of the three schema values
          type: "invented",
          // @ts-expect-error a capture rule is one of the three schema values
          "capture-on": "sometimes",
          name: "build",
          paths: ["dist/**"],
        },
      ],
    });

    expect(render(config, { header: "" })).toContain("name: build");
  });
});

describe("artifacts upload validation", () => {
  it("refuses an upload with an empty name at the upload's name", () => {
    const config = withArtifacts({ upload: [{ name: "", paths: ["dist/**"] }] });

    expect(diagnosticsOf(config).map(({ path, message }) => ({ path, message }))).toStrictEqual([
      {
        path: "$.pipelines.default[0].step.artifacts.upload[0].name",
        message: "an artifact upload needs a non-empty name",
      },
    ]);
  });

  it("refuses an upload search depth below one at the upload's depth", () => {
    const config = withArtifacts({ upload: [{ depth: 0, name: "build", paths: ["dist/**"] }] });

    expect(diagnosticsOf(config).map(({ path, message }) => ({ path, message }))).toStrictEqual([
      {
        path: "$.pipelines.default[0].step.artifacts.upload[0].depth",
        message: "an artifact upload needs a depth of at least 1",
      },
    ]);
  });

  it("refuses an upload with no paths at the upload's paths", () => {
    const config = withArtifacts({ upload: [{ name: "build", paths: [] }] });

    expect(diagnosticsOf(config).map(({ path, message }) => ({ path, message }))).toStrictEqual([
      {
        path: "$.pipelines.default[0].step.artifacts.upload[0].paths",
        message: "an artifact upload needs at least one path",
      },
    ]);
  });
});
