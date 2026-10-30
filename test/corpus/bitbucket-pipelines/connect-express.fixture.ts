import {
  type PipelineConfig,
  pipelineConfig,
  pipe,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/**
 * The definition `connect-express.yml` must reproduce. It lives beside the test so the
 * coverage-debt ledger can import it and walk every fixture in one place.
 *
 * Entries are compared semantically, so a fixture may write a scalar or a collection however the
 * DSL prefers. Where the vocabulary models a key, a fixture uses that field rather than `raw`.
 */
export const CONNECT_EXPRESS: PipelineConfig = pipelineConfig({
  image: "node:18-bullseye",
  pipelines: {
    default: [
      step({
        script: [
          "apt-get update && apt-get install -y default-jdk",
          "npm install",
          "npm test",
          "npm run lint:all",
          "npm run checktypes",
        ],
      }),
    ],
    branches: [
      {
        pattern: "master",
        pipeline: [
          step({
            oidc: true,
            name: "Publish to Atlassian Artifactory",
            script: [
              "apt-get update && apt-get install -y default-jdk",
              "npm install",
              "npm test",
              "npm run lint:all",
              "npm run checktypes",
              pipe({ pipe: "docker://atlassian/packages-oidc-pipe:latest" }),
              "source .envrc",
              'echo "Publishing version $PACKAGE_VERSION to Atlassian Artifactory npm-public..."',
              'npm publish --userconfig=./.npmrc-public --@atlassian/atlassian-connect-express:registry="https://packages.atlassian.com/api/npm/npm-public/"',
            ],
          }),
        ],
      },
    ],
  },
});
