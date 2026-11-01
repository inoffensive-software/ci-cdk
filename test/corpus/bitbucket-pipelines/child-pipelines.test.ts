import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { render } from "../../../src/bitbucket-pipelines/index.js";
import { problemsFor } from "../../schemas/validate.js";
import { CHILD_PIPELINES } from "./child-pipelines.fixture.js";

/**
 * The child-pipeline step has no redistributable config, so this fixture is built from the
 * Atlassian page's own example and proves the emitted bytes, their parse and their conformance.
 */
const EXPECTED = [
  "pipelines:",
  "  custom:",
  "    a-parent-pipeline:",
  "      - variables:",
  "          - allowed-values:",
  "              - val1",
  "              - val2",
  "            default: val1",
  "            name: parent_pipeline_variable",
  "      - step:",
  "          custom: a-child-pipeline",
  "          input-variables:",
  "            var_1: $parent_pipeline_variable",
  "            var_2: $repository_variable_name",
  "            var_3: $workspace_variable_name",
  "            var_4: static-value-1",
  "            var_5: static-value-2",
  "          name: Child pipeline",
  "          type: pipeline",
  "    a-child-pipeline:",
  "      - step:",
  "          name: Child Pipeline step",
  "          script:",
  '            - echo "Parent Pipeline Step Variable -" $var_1',
  '            - echo "Parent Pipeline Step Variable -" $var_2',
  "",
].join("\n");

const rendered = (): string => render(CHILD_PIPELINES, { header: "" });

/** The parsed form of the page's example, with the keys our emitter orders alphabetically. */
const EXPECTED_DATA = {
  pipelines: {
    custom: {
      "a-parent-pipeline": [
        {
          variables: [
            {
              "allowed-values": ["val1", "val2"],
              default: "val1",
              name: "parent_pipeline_variable",
            },
          ],
        },
        {
          step: {
            custom: "a-child-pipeline",
            "input-variables": {
              var_1: "$parent_pipeline_variable",
              var_2: "$repository_variable_name",
              var_3: "$workspace_variable_name",
              var_4: "static-value-1",
              var_5: "static-value-2",
            },
            name: "Child pipeline",
            type: "pipeline",
          },
        },
      ],
      "a-child-pipeline": [
        {
          step: {
            name: "Child Pipeline step",
            script: [
              'echo "Parent Pipeline Step Variable -" $var_1',
              'echo "Parent Pipeline Step Variable -" $var_2',
            ],
          },
        },
      ],
    },
  },
};

describe("documentation-derived child pipelines", () => {
  it("emits the parent variable, the child step and the child pipeline exactly", () => {
    expect(rendered()).toBe(EXPECTED);
  });

  it("parses back to the data it was built from", () => {
    expect(parse(rendered())).toStrictEqual(EXPECTED_DATA);
  });

  it("validates against the pinned schema", () => {
    expect(problemsFor("bitbucket-pipelines", rendered())).toStrictEqual([]);
  });
});
