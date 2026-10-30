import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic } from "../core/index.js";
import { type Artifacts, type PipelineConfig, pipelineConfig, render, step } from "./index.js";

interface ParsedUpload {
  readonly name?: string;
  readonly paths?: readonly string[];
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
