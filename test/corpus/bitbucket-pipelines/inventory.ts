import {
  type PipelineConfig,
  type StepItem,
  finalStep,
  parallel,
  pipe,
  pipelineConfig,
  stage,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/** One inventory document: a configuration, plus the name a failure should use for it. */
export interface InventoryDocument {
  readonly name: string;
  readonly config: PipelineConfig;
}

/** The step body: every field the vocabulary emits at a step, in one place. */
const everyField = (): StepItem =>
  step({
    "after-script": [
      "echo teardown",
      pipe({ pipe: "atlassian/teardown:1", variables: { KEEP: "true" } }),
    ],
    artifacts: ["dist/**"],
    caches: ["node-modules", "build-output"],
    clone: { depth: 10, enabled: true, lfs: true, "skip-ssl-verify": true },
    condition: { state: "successful", changesets: { includePaths: ["src/**"] } },
    "concurrency-group": "build-$BITBUCKET_BRANCH",
    deployment: "staging",
    environment: "staging",
    "fail-fast": true,
    image: "node:24",
    "max-time": 30,
    name: "Build",
    oidc: true,
    "runs-on": ["self.hosted", "linux"],
    script: [
      "npm ci",
      pipe({
        pipe: "atlassian/npm:1",
        variables: { NPM_TOKEN: "${NPM_TOKEN}", FLAGS: ["--quiet", "--no-audit"] },
      }),
    ],
    services: ["database"],
    size: "8x",
    trigger: "automatic",
  });

/** A second step shape: an image map with credentials, so the child keys are modelled too. */
const credentialedStep = (): StepItem =>
  step({
    image: { name: "node:24", username: "builder", password: "${REGISTRY_PASSWORD}" },
    script: ["npm run build"],
  });

/** A cleanup step: every final field Bitbucket allows, with the two it forbids left out. */
const cleanup = () =>
  finalStep({
    "after-script": [
      "echo done",
      pipe({ pipe: "atlassian/cleanup:1", variables: { LOG: "true" } }),
    ],
    artifacts: ["coverage/**"],
    caches: ["build-output"],
    clone: { depth: 1, enabled: false, lfs: false, "skip-ssl-verify": false },
    condition: { state: "always()", changesets: { excludePaths: ["docs/**"] } },
    "concurrency-group": "cleanup",
    environment: "cleanup",
    image: { name: "node:24", username: "builder", password: "${REGISTRY_PASSWORD}" },
    "max-time": 5,
    name: "Cleanup",
    oidc: false,
    "runs-on": ["linux"],
    script: ["echo cleanup", pipe({ pipe: "atlassian/cleanup:2", variables: {} })],
    services: ["database"],
    size: "1x",
    trigger: "automatic",
  });

/**
 * The definitions that between them exercise every key the vocabulary can emit. One document
 * carries everything that can coexist; root `image` and `clone.depth` shapes that cannot share a
 * document with another get their own.
 *
 * The gate renders each document, parses the result and unions the key paths, so this file is the
 * single definition of "modelled". It must not use `raw`; a key it cannot reach through a field is a
 * gap in the vocabulary, not a reason to widen the inventory.
 */
export const INVENTORY: readonly InventoryDocument[] = [
  {
    name: "main",
    config: pipelineConfig({
      clone: { depth: 50, enabled: true, lfs: true, "skip-ssl-verify": true },
      definitions: {
        caches: {
          "node-modules": "node_modules",
          "build-output": { path: "dist", key: { files: ["yarn.lock", "package.json"] } },
        },
        services: {
          database: {
            image: "postgres:17",
            memory: 2048,
            type: "docker",
            variables: { POSTGRES_DB: "app" },
          },
        },
        steps: [everyField()],
      },
      image: { name: "node:24", username: "builder", password: "${REGISTRY_PASSWORD}" },
      options: { docker: true, "max-time": 120, "runs-on": ["self.hosted", "linux"], size: "4x" },
      pipelines: {
        default: [everyField(), credentialedStep(), cleanup()],
        branches: [
          {
            pattern: "main",
            pipeline: [
              everyField(),
              step({
                name: "Deploy",
                script: [
                  "make deploy",
                  pipe({ pipe: "atlassian/deploy:1", variables: { TARGET: "production" } }),
                ],
              }),
              stage({
                condition: { state: "successful" },
                deployment: "production",
                environment: "production",
                name: "Release",
                steps: [everyField()],
                trigger: "manual",
              }),
            ],
          },
          {
            pattern: "release/*",
            pipeline: [
              parallel([step({ script: ["npm test"] }), step({ script: ["npm run lint"] })]),
              stage({
                condition: { changesets: { excludePaths: ["docs/**"] } },
                name: "Package",
                steps: [step({ script: ["npm pack"] })],
              }),
            ],
          },
        ],
        tags: [
          {
            pattern: "*",
            pipeline: [
              everyField(),
              step({
                script: [pipe({ pipe: "atlassian/tag:1", variables: { TAG: "$BITBUCKET_TAG" } })],
              }),
              parallel({
                steps: [everyField(), step({ script: ["npm run lint"] })],
                "fail-fast": true,
              }),
            ],
          },
        ],
        "pull-requests": [
          {
            pattern: "**",
            pipeline: [
              everyField(),
              step({
                script: [
                  pipe({ pipe: "atlassian/pr:1", variables: { PR_ID: "$BITBUCKET_PR_ID" } }),
                ],
              }),
              parallel([everyField(), step({ script: ["npm run lint"] })]),
              stage({
                condition: { changesets: { includePaths: ["src/**"] } },
                name: "Verify",
                steps: [everyField()],
              }),
            ],
          },
        ],
        custom: [
          {
            name: "cleanup",
            pipeline: [
              everyField(),
              step({
                script: [
                  pipe({ pipe: "atlassian/custom:1", variables: { REASON: "$BITBUCKET_BRANCH" } }),
                ],
              }),
              cleanup(),
            ],
          },
        ],
      },
    }),
  },
  {
    name: "image-string",
    config: pipelineConfig({
      clone: { depth: "full" },
      image: "node:24",
      pipelines: { default: [step({ script: ["true"] })] },
    }),
  },
  {
    name: "image-name",
    config: pipelineConfig({
      image: { name: "node:22" },
      pipelines: { default: [step({ script: ["true"] })] },
    }),
  },
];
