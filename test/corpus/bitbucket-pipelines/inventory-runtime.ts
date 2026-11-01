import {
  type CloudRuntime,
  type FinalItem,
  type Image,
  type SelfHostedRuntime,
  type StepItem,
  finalStep,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/** The cloud runtime every key at once, so one position proves the whole map. */
export const CLOUD: CloudRuntime = {
  arch: "arm",
  "atlassian-ip-ranges": true,
  "instance-type": "m6g.large",
  platform: "windows",
  version: "3",
};

/** The self-hosted variants: every sizing key, volumes, and each storage arm. */
const SELF_HOSTED: readonly SelfHostedRuntime[] = [
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
];

/** The image arms a step can carry, one shape each because an image holds one arm. */
const IMAGES: readonly Image[] = [
  { name: "node:24", "run-as-user": 1000 },
  { name: "node:22", aws: { "oidc-role": "${AWS_BB_PULL_ROLE}" }, "run-as-user": 0 },
  {
    name: "node:24",
    aws: { "access-key": "${AWS_ACCESS_KEY_ID}", "secret-key": "${AWS_SECRET_ACCESS_KEY}" },
    "run-as-user": 1000,
  },
];

/** One self-hosted step per storage arm, so no arm hides behind another document. */
export const everySelfHostedSteps = (): readonly StepItem[] =>
  SELF_HOSTED.map((runtime) => step({ runtime: { "self-hosted": runtime }, script: ["true"] }));

/** One step per image map arm; the credentialed form stays in `everyField`. */
export const everyImageSteps = (): readonly StepItem[] =>
  IMAGES.map((image) => step({ image, script: ["true"] }));

/** A final step per self-hosted storage arm, because a pipeline allows a single final step. */
export const everyFinalRuntime = (index: number): FinalItem => {
  const runtime = SELF_HOSTED[index];

  if (runtime === undefined) {
    throw new RangeError(`no self-hosted runtime at ${String(index)}`);
  }

  return finalStep({ runtime: { "self-hosted": runtime }, script: ["true"] });
};
