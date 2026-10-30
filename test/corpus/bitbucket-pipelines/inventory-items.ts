import {
  type Changesets,
  type FinalStep,
  type PipelineItem,
  type Stage,
  type StepItem,
  finalStep,
  parallel,
  pipe,
  stage,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/**
 * The two changeset branches. `Changesets` is a union that forbids both lists together, so a
 * position that can carry a condition needs one item per branch; the pair is the field, not an
 * extra shape.
 */
const INCLUDED: Changesets = { includePaths: ["src/**"] };
const EXCLUDED: Changesets = { excludePaths: ["docs/**"] };

const IMAGE = { name: "node:24", username: "builder", password: "${REGISTRY_PASSWORD}" } as const;

/**
 * A step body carrying every field the vocabulary can emit, including both pipe sequences. The
 * image is the credentialed map, so its child keys are exercised too; the string and name-only
 * forms live in their own documents because one key can only hold one shape.
 */
const everyField = (changesets: Changesets = INCLUDED): StepItem =>
  step({
    "after-script": [
      "echo teardown",
      pipe({ pipe: "atlassian/teardown:1", variables: { KEEP: "true", FLAGS: ["--quiet"] } }),
    ],
    artifacts: ["dist/**"],
    caches: ["node-modules", "build-output"],
    clone: { depth: 10, enabled: true, lfs: true, "skip-ssl-verify": true },
    condition: { changesets, state: "successful" },
    "concurrency-group": "build-$BITBUCKET_BRANCH",
    deployment: "staging",
    environment: "staging",
    "fail-fast": true,
    image: IMAGE,
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

/** The cleanup body: every field a final step allows, with the two it forbids left out. */
const everyFinal = (): PipelineItem => {
  const body: FinalStep = {
    "after-script": [
      "echo done",
      pipe({ pipe: "atlassian/cleanup:1", variables: { LOG: "true", FLAGS: ["--quiet"] } }),
    ],
    artifacts: ["coverage/**"],
    caches: ["build-output"],
    clone: { depth: 1, enabled: false, lfs: false, "skip-ssl-verify": false },
    condition: { changesets: EXCLUDED, state: "always()" },
    "concurrency-group": "cleanup",
    environment: "cleanup",
    image: IMAGE,
    "max-time": 5,
    name: "Cleanup",
    oidc: false,
    "runs-on": ["linux"],
    script: [
      "echo cleanup",
      pipe({ pipe: "atlassian/cleanup:2", variables: { LOG: "true", FLAGS: ["--quiet"] } }),
    ],
    services: ["database"],
    size: "1x",
    trigger: "automatic",
  };

  return finalStep(body);
};

/**
 * A stage's child step. Bitbucket carries the condition on the stage, so this body keeps every
 * other field and leaves `condition` out; the stage itself exercises both condition branches.
 */
const everyStageStep = (): StepItem =>
  step({
    "after-script": [
      "echo teardown",
      pipe({ pipe: "atlassian/teardown:1", variables: { KEEP: "true", FLAGS: ["--quiet"] } }),
    ],
    artifacts: ["dist/**"],
    caches: ["node-modules", "build-output"],
    clone: { depth: 10, enabled: true, lfs: true, "skip-ssl-verify": true },
    "concurrency-group": "build-$BITBUCKET_BRANCH",
    deployment: "staging",
    environment: "staging",
    "fail-fast": true,
    image: IMAGE,
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

/** A stage body carries its own condition, one document per branch, plus its child step. */
const everyStage = (changesets: Changesets = INCLUDED): Stage => ({
  condition: { changesets, state: "successful" },
  deployment: "production",
  environment: "production",
  name: "Release",
  steps: [everyStageStep()],
  trigger: "manual",
});

/**
 * Every item form a pipeline section repeats: a step, both parallel forms, both stage condition
 * branches, and the final step. The same sequence in every section is what makes the inventory
 * position-complete, so the diff cannot mistake a repeated field for missing vocabulary.
 */
export const everyItems = (): readonly PipelineItem[] => [
  everyField(INCLUDED),
  everyField(EXCLUDED),
  parallel([everyField(INCLUDED), everyField(EXCLUDED)]),
  parallel({
    "fail-fast": true,
    steps: [everyField(INCLUDED), everyField(EXCLUDED)],
  }),
  stage(everyStage(INCLUDED)),
  stage(everyStage(EXCLUDED)),
  everyFinal(),
];

/** Reusable step definitions carry the same body, so definitions.steps is not a narrower position. */
export const everyDefinedStep = (): readonly StepItem[] => [
  everyField(INCLUDED),
  everyField(EXCLUDED),
];
