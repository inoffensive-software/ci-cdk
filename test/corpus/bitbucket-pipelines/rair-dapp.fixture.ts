import {
  type PipelineConfig,
  pipelineConfig,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/**
 * The definition `rair-dapp.yml` must reproduce: a changeset-conditioned default step, a service
 * definition, and two pull-request selectors whose steps select caches and services by name.
 */
export const RAIR_DAPP: PipelineConfig = pipelineConfig({
  image: "node:16.13.0",
  definitions: {
    services: { docker: { memory: 3072 } },
  },
  pipelines: {
    default: [
      step({
        name: "Update RAIR API definition on rairtech.readme.com",
        script: ["npm install -g rdme", "./rairnode/readme/utils/update_readme.sh"],
        condition: {
          changesets: { includePaths: ["rairnode/readme/openapi/rairapi_current.yaml"] },
        },
      }),
    ],
    "pull-requests": [
      {
        pattern: "**",
        pipeline: [
          step({
            name: "Install Dependencies and run typescript test for minting-network",
            caches: ["node"],
            script: [
              "yarn --cwd ./minting-marketplace",
              "cd ./minting-marketplace && ./commands/run_tsc.sh",
            ],
            condition: { changesets: { includePaths: ["minting-marketplace/**"] } },
          }),
          step({
            name: "Run yarn install and compare generated yarn lock file with committed lock file",
            caches: ["node"],
            script: ["cd ./commands/dependency_sync_check/ && ./init.sh"],
            condition: { changesets: { includePaths: ["**/package.json", "**/yarn.lock"] } },
          }),
          step({
            name: "Test that frontend app builds successfully",
            caches: ["node"],
            services: ["docker"],
            script: [
              "cd ./commands/bitbucket-pipelines/frontend-build-success-pipeline/ && ./init.sh",
            ],
            condition: { changesets: { includePaths: ["minting-marketplace/**"] } },
          }),
        ],
      },
      {
        pattern: "feature/*",
        pipeline: [
          step({
            name: "Install Dependencies and run typescript test for minting-network",
            caches: ["node"],
            script: [
              "yarn --cwd ./minting-marketplace",
              "cd ./minting-marketplace && ./commands/run_tsc.sh",
            ],
            condition: { changesets: { includePaths: ["minting-marketplace/**"] } },
          }),
        ],
      },
    ],
  },
});
