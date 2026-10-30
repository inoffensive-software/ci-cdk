import {
  type PipelineConfig,
  type PipelineItem,
  type StepItem,
  parallel,
  pipelineConfig,
  pipe,
  stage,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/**
 * The definition `aligent-graphql-mesh.yml` must reproduce. The vendored file uses YAML anchors,
 * which the parser resolves; a fixture writes the resolved data, so each shared step body appears
 * once under `definitions.steps` and again inline wherever the anchor is referenced.
 */

const install = (): StepItem =>
  step({
    name: "🧶 Install",
    caches: ["yarn"],
    script: ["yarn install"],
    artifacts: ["node_modules/**"],
  });

const test = (): StepItem =>
  step({
    name: "⚙️ Test",
    script: [
      "FORCE_COLOR=true",
      "DESTINATION_BRANCH=origin/${DESTINATION_BRANCH:-$BITBUCKET_PR_DESTINATION_BRANCH}",
      "yarn nx affected:test --base=$DESTINATION_BRANCH --ci --code-coverage --parallel --max-parallel=3",
    ],
  });

const codeQuality = (): StepItem =>
  step({
    name: "🕵️‍♀️ Code Quality",
    size: "2x",
    script: [
      "FORCE_COLOR=true",
      "DESTINATION_BRANCH=origin/${DESTINATION_BRANCH:-$BITBUCKET_PR_DESTINATION_BRANCH}",
      "yarn nx affected:lint --base=$DESTINATION_BRANCH --parallel --max-parallel=3",
      "yarn nx format:check --base=$DESTINATION_BRANCH --parallel --max-parallel=3",
      "yarn nx affected -t check-types --base=$DESTINATION_BRANCH --parallel --max-parallel=3",
    ],
  });

const build = (): StepItem =>
  step({
    name: "🏭 Build all packages",
    script: ["yarn nx run-many -t build"],
    artifacts: ["dist/**"],
  });

const buildAllContainers = (): StepItem =>
  step({
    name: "🏗️ Build All Docker Containers",
    services: ["docker"],
    script: ["yarn nx run-many -t docker-build"],
  });

const buildContainer = (): StepItem =>
  step({
    name: "🏗️ Build Docker Container",
    services: ["docker"],
    script: [
      "yarn nx docker-build ${APPLICATION}",
      "docker save ${APPLICATION}:latest | gzip > ${APPLICATION}_latest.tar.gz",
    ],
    artifacts: ["*.tar.gz"],
  });

const deploy = (): StepItem =>
  step({
    name: "📦 Push to ECR",
    services: ["docker"],
    script: [
      "docker load --input ${APPLICATION}_latest.tar.gz",
      "docker tag ${APPLICATION}:latest ${IMAGE_NAME}:latest",
      pipe({
        pipe: "atlassian/aws-ecr-push-image:2.4.0",
        variables: { IMAGE_NAME: "${IMAGE_NAME}" },
      }),
    ],
  });

const orocommerce = (): PipelineItem =>
  stage({
    name: "Deploy OroCommerce Mesh",
    deployment: "orocommerce",
    steps: [buildContainer(), deploy()],
  });

const bigcommerce = (): PipelineItem =>
  stage({
    name: "Deploy BigCommerce Mesh",
    deployment: "bigcommerce",
    steps: [buildContainer(), deploy()],
  });

export const ALIGENT_GRAPHQL_MESH: PipelineConfig = pipelineConfig({
  image: "node:18",
  definitions: {
    caches: { yarn: { path: "/usr/local/share/.cache/yarn/v6" } },
    services: { "docker-extra-memory": { memory: 7168, type: "docker" } },
    steps: [
      install(),
      test(),
      codeQuality(),
      build(),
      buildAllContainers(),
      buildContainer(),
      deploy(),
    ],
  },
  pipelines: {
    custom: [
      {
        name: "owasp_scan",
        pipeline: [
          step({
            name: "OWASP Dependency Check",
            script: [
              pipe({
                pipe: "docker://aligent/owasp-dependency-check-pipe",
                variables: {
                  SCAN_PATH: "./yarn.lock",
                  SUPPRESSION_FILE_PATH: "./suppression.xml",
                  CVSS_FAIL_LEVEL: "1",
                },
              }),
            ],
          }),
        ],
      },
      {
        name: "renovate",
        pipeline: [
          step({
            name: "Run Renovate",
            size: "2x",
            script: [
              pipe({
                pipe: "docker://aligent/renovate-pipe:latest",
                variables: {
                  RENOVATE_PASSWORD: "$RENOVATE_PASSWORD",
                  RENOVATE_USERNAME: "$RENOVATE_USERNAME",
                  GITHUB_COM_TOKEN: "$GITHUB_COM_TOKEN",
                  NPM_PUBLISH_TOKEN: "$NPM_PUBLISH_TOKEN",
                  CONFIG_FILE: "renovate_config.js",
                },
              }),
            ],
            services: ["docker-extra-memory"],
          }),
        ],
      },
    ],
    "pull-requests": [
      {
        pattern: "**",
        pipeline: [install(), build(), parallel([buildAllContainers(), codeQuality(), test()])],
      },
    ],
    branches: [
      {
        pattern: "main",
        pipeline: [install(), orocommerce(), bigcommerce()],
      },
    ],
  },
});
