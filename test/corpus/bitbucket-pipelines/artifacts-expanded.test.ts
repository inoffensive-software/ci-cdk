import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { pipelineConfig, render, step } from "../../../src/bitbucket-pipelines/index.js";
import { readVendored } from "../vendored.js";
import { ARTIFACTS_EXPANDED } from "./artifacts-expanded.fixture.js";

describe("corpus: snyk-schmidtty/goof-artifactory", () => {
  it("reproduces the pinned config's data, header suppressed", async () => {
    const upstream = parse(await readVendored(import.meta.dirname, "artifacts-expanded.yml"));

    expect(parse(render(ARTIFACTS_EXPANDED, { header: "" }))).toStrictEqual(upstream);
  });
});

/**
 * The named `upload` entries and the name-list `download` have no redistributable config, so this
 * fixture is built from the child-pipeline page's examples and proves the emitted bytes directly.
 */
const nameListAndUploads = (): string =>
  render(
    pipelineConfig({
      pipelines: {
        default: [
          step({
            artifacts: {
              download: ["build", "test-reports"],
              paths: ["coverage/**"],
              upload: [
                { name: "build", paths: ["dist/**"] },
                { name: "reports", paths: ["coverage/**"] },
              ],
            },
            script: ["true"],
          }),
        ],
      },
    }),
    { header: "" },
  );

describe("documentation-derived artifacts shapes", () => {
  it("emits download, paths and named uploads in that order", () => {
    expect(nameListAndUploads()).toBe(
      [
        "pipelines:",
        "  default:",
        "    - step:",
        "        artifacts:",
        "          download:",
        "            - build",
        "            - test-reports",
        "          paths:",
        "            - coverage/**",
        "          upload:",
        "            - name: build",
        "              paths:",
        "                - dist/**",
        "            - name: reports",
        "              paths:",
        "                - coverage/**",
        "        script:",
        '          - "true"',
        "",
      ].join("\n"),
    );
  });

  it("parses back to the data it was built from", () => {
    expect(parse(nameListAndUploads())).toStrictEqual({
      pipelines: {
        default: [
          {
            step: {
              artifacts: {
                download: ["build", "test-reports"],
                paths: ["coverage/**"],
                upload: [
                  { name: "build", paths: ["dist/**"] },
                  { name: "reports", paths: ["coverage/**"] },
                ],
              },
              script: ["true"],
            },
          },
        ],
      },
    });
  });
});
