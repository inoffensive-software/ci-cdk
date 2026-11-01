import { type PipelineConfig, pipelineConfig } from "../../../src/bitbucket-pipelines/index.js";

/**
 * The definition `runtime-chaosgroup.yml` reproduces, pinned by the provenance record.
 */
export const RUNTIME_CHAOSGROUP: PipelineConfig = pipelineConfig({
  pipelines: {
    default: [
      {
        parallel: [
          {
            step: {
              image: "gcc:10.2",
              runtime: {
                cloud: {
                  arch: "x86",
                },
              },
              name: "test_amd64",
              script: ["cd common", "CXX=g++ ./build_unit.sh", "./unittest"],
            },
          },
        ],
      },
    ],
  },
});
