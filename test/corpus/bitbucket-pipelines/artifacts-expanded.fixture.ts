import {
  type PipelineConfig,
  pipelineConfig,
  pipe,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/**
 * The definition `artifacts-expanded.yml` must reproduce: one default step that publishes a filtered
 * path list with `download: true`, running the Snyk scanner twice with different variables.
 */
export const ARTIFACTS_EXPANDED: PipelineConfig = pipelineConfig({
  image: "node:latest",
  pipelines: {
    default: [
      step({
        caches: ["node", "docker"],
        script: [
          "npm install",
          "npm install -g snyk",
          "snyk auth $SNYK_TOKEN",
          "snyk code test --sarif > snykcode_results.sarif || true",
          "docker build -t snykschmidtty/goof:latest .",
          pipe({
            pipe: "snyk/snyk-scan:0.5.1",
            variables: {
              SNYK_TOKEN: "$SNYK_TOKEN",
              LANGUAGE: "npm",
              DONT_BREAK_BUILD: "true",
              MONITOR: "true",
              CODE_INSIGHTS_RESULTS: "true",
              EXTRA_ARGS:
                "--project-name=goof-bitbucket-pipelines --remote-repo-url=goof-bitbucket-pipelines",
            },
          }),
          pipe({
            pipe: "snyk/snyk-scan:0.5.1",
            variables: {
              SNYK_TOKEN: "$SNYK_TOKEN",
              LANGUAGE: "docker",
              IMAGE_NAME: "snykschmidtty/goof:latest",
              DONT_BREAK_BUILD: "true",
              MONITOR: "true",
              EXTRA_ARGS: "--project-name=docker-image|goof-bitbucket-pipelines --app-vulns",
            },
          }),
        ],
        artifacts: {
          download: true,
          paths: ["snykcode_results.sarif"],
        },
      }),
    ],
  },
});
