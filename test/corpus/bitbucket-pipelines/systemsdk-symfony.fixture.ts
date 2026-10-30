import {
  type PipelineConfig,
  type StepItem,
  pipelineConfig,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/**
 * The definition `systemsdk-symfony.yml` must reproduce. The vendored file uses YAML anchors, which
 * the parser resolves; a fixture writes the resolved data, so the shared step body appears once under
 * `definitions.steps` and again inline in every selector that referenced the anchor.
 *
 * `artifacts` has no modelled field yet, so it is written through the step's `raw` block and declared
 * once per occurrence in the coverage ledger.
 */
const buildTestAnalyze = (): StepItem =>
  step({
    name: "Build, Test and Analyze",
    script: [
      "chmod +x .bitbucket/dependencies.sh",
      ".bitbucket/dependencies.sh",
      "make build-test",
      "make start-test",
      "docker ps -a",
      "make wait-for-db",
      "make drop-migrate",
      "make messenger-setup-transports",
      "make info",
      "make phpunit",
      "make composer-audit",
      "make ecs",
      "make phpcs",
      "make phpstan",
      "make phpinsights",
      "make phpmd",
      "make phpcpd",
      "make down-test",
    ],
    raw: { artifacts: ["reports/**"] },
  });

export const SYSTEMSDK_SYMFONY: PipelineConfig = pipelineConfig({
  image: "docker:stable",
  options: { docker: true },
  definitions: { steps: [buildTestAnalyze()] },
  pipelines: {
    branches: [
      { pattern: "main", pipeline: [buildTestAnalyze()] },
      { pattern: "develop", pipeline: [buildTestAnalyze()] },
    ],
    "pull-requests": [{ pattern: "**", pipeline: [buildTestAnalyze()] }],
    tags: [{ pattern: "*", pipeline: [buildTestAnalyze()] }],
  },
});
