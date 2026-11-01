import {
  type PipelineConfig,
  pipelineConfig,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/**
 * The child-pipeline example from the Atlassian page's `input-variables` section, written through
 * the public API. The page shows the parent declaring one manual-run variable, one child step that
 * names the child pipeline and passes five inputs, and the child pipeline reading two of them.
 *
 * No permissively licensed config uses a child step, so this fixture is documentation-derived
 * rather than vendored; `PROVENANCE.md` records the page and its retrieval date.
 */
export const CHILD_PIPELINES: PipelineConfig = pipelineConfig({
  pipelines: {
    custom: [
      {
        name: "a-parent-pipeline",
        variables: [
          {
            name: "parent_pipeline_variable",
            default: "val1",
            "allowed-values": ["val1", "val2"],
          },
        ],
        pipeline: [
          step({
            name: "Child pipeline",
            type: "pipeline",
            custom: "a-child-pipeline",
            "input-variables": {
              var_1: "$parent_pipeline_variable",
              var_2: "$repository_variable_name",
              var_3: "$workspace_variable_name",
              var_4: "static-value-1",
              var_5: "static-value-2",
            },
          }),
        ],
      },
      {
        name: "a-child-pipeline",
        pipeline: [
          step({
            name: "Child Pipeline step",
            script: [
              'echo "Parent Pipeline Step Variable -" $var_1',
              'echo "Parent Pipeline Step Variable -" $var_2',
            ],
          }),
        ],
      },
    ],
  },
});
