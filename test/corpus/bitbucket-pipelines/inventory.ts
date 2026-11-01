import {
  type Image,
  type NamedPipeline,
  type PipelineConfig,
  type SelectorPipeline,
  pipelineConfig,
  step,
} from "../../../src/bitbucket-pipelines/index.js";
import { CHILD_FINAL_DOCUMENTS } from "./inventory-child.js";
import { everyDefinedStep, everyFinalArtifacts, everyItems } from "./inventory-items.js";
import { everyFinalRuntime } from "./inventory-runtime.js";

/** The cloud runtime every key at once; the step inventories carry the same map. */
const CLOUD_RUNTIME = {
  arch: "arm",
  "atlassian-ip-ranges": true,
  "instance-type": "m6g.large",
  platform: "windows",
  version: "3",
} as const;

/** The self-hosted variants the options and final positions each carry one of. */
const SELF_HOSTED_RUNTIME = [
  {
    cpu: 4,
    memory: 8192,
    storage: {
      aws: { bucket: "runner-cache", region: "ap-southeast-2", "oidc-role": "${RUNNER_ROLE}" },
    },
    volumes: ["/var/run/docker.sock:/var/run/docker.sock"],
  },
  {
    cpu: 2,
    memory: 4096,
    storage: {
      aws: {
        bucket: "runner-cache",
        region: "us-east-1",
        "access-key": "${AWS_ACCESS_KEY_ID}",
        "secret-key": "${AWS_SECRET_ACCESS_KEY}",
      },
    },
    volumes: ["/tmp:/tmp"],
  },
  {
    cpu: 8,
    memory: 16384,
    storage: { gcp: { bucket: "runner-cache", "key-file": "${GCP_KEY_FILE}" } },
    volumes: ["/cache:/cache"],
  },
] as const;

/** The image map arms a service can carry, one per service because an image holds one arm. */
const SERVICE_IMAGES: readonly [Image, Image, Image, Image] = [
  { name: "postgres:17", "run-as-user": 70 },
  {
    name: "123.dkr.ecr.us-east-1.amazonaws.com/postgres:17",
    aws: { "oidc-role": "${AWS_BB_PULL_ROLE}" },
    "run-as-user": 70,
  },
  {
    name: "123.dkr.ecr.us-east-1.amazonaws.com/postgres:17",
    aws: { "access-key": "${AWS_ACCESS_KEY_ID}", "secret-key": "${AWS_SECRET_ACCESS_KEY}" },
    "run-as-user": 70,
  },
  {
    name: "registry.example.com/postgres:17",
    username: "builder",
    password: "${REGISTRY_PASSWORD}",
    "run-as-user": 70,
  },
];

/** One inventory document: a configuration, plus the name a failure should use for it. */
export interface InventoryDocument {
  readonly name: string;
  readonly config: PipelineConfig;
}

/** A selector entry is the same body under every pattern, so the section repeats one shape. */
const selector = (pattern: string): SelectorPipeline => ({ pattern, pipeline: everyItems() });

/** A custom pipeline names its trigger and declares every variable key a manual run can set. */
const named = (name: string): NamedPipeline => ({
  name,
  variables: [
    {
      name: "TARGET",
      description: "Where to deploy",
      default: "staging",
      "allowed-values": ["staging", "production"],
    },
  ],
  pipeline: everyItems(),
});

/**
 * The documents that between them exercise every key the vocabulary can emit, in every position the
 * provider repeats. One document carries everything that can coexist; root `image` shapes and
 * `clone.depth` forms that cannot share a document with another get their own.
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
          "registry-name": { image: SERVICE_IMAGES[0], memory: 1024 },
          "registry-role": { image: SERVICE_IMAGES[1], memory: 1024 },
          "registry-keys": { image: SERVICE_IMAGES[2], memory: 1024 },
          "registry-basic": { image: SERVICE_IMAGES[3], memory: 1024 },
        },
        steps: everyDefinedStep(),
      },
      image: {
        name: "node:24",
        username: "builder",
        password: "${REGISTRY_PASSWORD}",
        "run-as-user": 1000,
      },
      labels: { team: "platform", tier: "backend" },
      options: {
        docker: true,
        "max-time": 120,
        "runs-on": ["self.hosted", "linux"],
        runtime: { cloud: CLOUD_RUNTIME },
        size: "4x",
      },
      pipelines: {
        default: everyItems(),
        branches: [selector("main"), selector("release/*")],
        tags: [selector("*")],
        "pull-requests": [selector("**")],
        custom: [named("cleanup")],
      },
      triggers: {
        "pullrequest-push": [
          {
            condition: 'BITBUCKET_PR_DESTINATION_BRANCH == "main"',
            pipelines: ["cleanup", "build"],
          },
        ],
        "pipeline-completed": [
          { condition: 'BITBUCKET_TRIGGER_PIPELINE_STATUS == "FAILED"', pipelines: ["cleanup"] },
        ],
      },
    }),
  },
  {
    name: "expanded-final",
    config: pipelineConfig({
      pipelines: {
        default: [step({ script: ["true"] }), everyFinalArtifacts(true)],
      },
    }),
  },
  {
    name: "expanded-final-names",
    config: pipelineConfig({
      pipelines: {
        default: [step({ script: ["true"] }), everyFinalArtifacts(["coverage"])],
      },
    }),
  },
  {
    name: "expanded-final-sections",
    config: pipelineConfig({
      pipelines: {
        branches: [
          { pattern: "main", pipeline: [step({ script: ["true"] }), everyFinalArtifacts(true)] },
          {
            pattern: "release/*",
            pipeline: [step({ script: ["true"] }), everyFinalArtifacts(["coverage"])],
          },
        ],
        tags: [
          { pattern: "*", pipeline: [step({ script: ["true"] }), everyFinalArtifacts(true)] },
          {
            pattern: "v*",
            pipeline: [step({ script: ["true"] }), everyFinalArtifacts(["coverage"])],
          },
        ],
        "pull-requests": [
          { pattern: "**", pipeline: [step({ script: ["true"] }), everyFinalArtifacts(true)] },
          {
            pattern: "pr-*",
            pipeline: [step({ script: ["true"] }), everyFinalArtifacts(["coverage"])],
          },
        ],
      },
    }),
  },
  {
    name: "expanded-final-custom",
    config: pipelineConfig({
      pipelines: {
        custom: [
          { name: "publish", pipeline: [step({ script: ["true"] }), everyFinalArtifacts(true)] },
          {
            name: "publish-named",
            pipeline: [step({ script: ["true"] }), everyFinalArtifacts(["coverage"])],
          },
        ],
      },
    }),
  },
  ...CHILD_FINAL_DOCUMENTS,
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
      image: { name: "node:22", "run-as-user": 1000 },
      pipelines: { default: [step({ script: ["true"] })] },
    }),
  },
  {
    name: "image-aws-role",
    config: pipelineConfig({
      image: {
        name: "123.dkr.ecr.us-east-1.amazonaws.com/app:1",
        aws: { "oidc-role": "${AWS_BB_PULL_ROLE}" },
        "run-as-user": 1000,
      },
      pipelines: { default: [step({ script: ["true"] })] },
    }),
  },
  {
    name: "image-aws-keys",
    config: pipelineConfig({
      image: {
        name: "123.dkr.ecr.us-east-1.amazonaws.com/app:1",
        aws: {
          "access-key": "${AWS_ACCESS_KEY_ID}",
          "secret-key": "${AWS_SECRET_ACCESS_KEY}",
        },
        "run-as-user": 1000,
      },
      pipelines: { default: [step({ script: ["true"] })] },
    }),
  },
  ...SELF_HOSTED_RUNTIME.map((runtime, index) => ({
    name: `options-runtime-${String(index)}`,
    config: pipelineConfig({
      options: { runtime: { "self-hosted": runtime } },
      pipelines: {
        default: [step({ script: ["true"] }), everyFinalRuntime(index)],
        branches: [
          { pattern: "main", pipeline: [step({ script: ["true"] }), everyFinalRuntime(index)] },
        ],
        tags: [{ pattern: "*", pipeline: [step({ script: ["true"] }), everyFinalRuntime(index)] }],
        "pull-requests": [
          { pattern: "**", pipeline: [step({ script: ["true"] }), everyFinalRuntime(index)] },
        ],
        custom: [
          { name: "release", pipeline: [step({ script: ["true"] }), everyFinalRuntime(index)] },
        ],
      },
    }),
  })),
];
