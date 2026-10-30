import { type Pipeline, job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

/** One inventory document: a definition, plus the name a failure should use for it. */
export interface InventoryDocument {
  readonly name: string;
  readonly pipeline: Pipeline;
}

/**
 * The definitions that between them exercise every key the vocabulary can emit, and nothing else. The
 * gate renders each one, parses the result and unions the key paths, so this file is the single
 * definition of "modelled". It must not use `raw`: a key it cannot reach through a field is a gap in
 * the vocabulary, not a reason to widen the inventory.
 *
 * The second document exists because several fields accept two shapes, and each shape adds paths of
 * its own: a single `include` entry is a map, a single `cache` is a map, a retry count is a scalar,
 * and an image or service can be a bare string.
 *
 * The hidden template is here to prove the gate's treatment of author data: its keys are `.`-prefixed
 * at the document root and therefore never enter the modelled set.
 */
export const INVENTORY: readonly InventoryDocument[] = [
  {
    name: "main",
    pipeline: pipeline({
      default: {
        image: { name: "golang:1.26", entrypoint: [""], pull_policy: "if-not-present" },
        services: [
          "postgres:16",
          {
            name: "redis:7",
            alias: "cache",
            entrypoint: ["/bin/sh"],
            command: ["redis-server"],
            variables: { REDIS_URL: "redis://cache:6379" },
          },
        ],
        tags: ["gitlab-org"],
        before_script: "echo before",
        after_script: ["echo one", "echo two"],
        cache: [
          {
            key: "go",
            paths: [".cache/go"],
            policy: "pull",
            untracked: true,
            when: "on_success",
            fallback_keys: ["go-main"],
          },
          {
            key: { files: ["go.sum", "v2/go.sum"], prefix: "build-" },
            paths: [".cache/build"],
            policy: "pull-push",
          },
        ],
        artifacts: {
          paths: ["dist/"],
          exclude: ["dist/tmp/"],
          name: "build-$CI_JOB_NAME",
          expire_in: "1 week",
          expose_as: "build",
          public: true,
          when: "always",
          reports: { junit: ["report.xml"] },
        },
        retry: { max: 2, when: ["runner_system_failure"], exit_codes: [137] },
        timeout: "1h 30m",
        interruptible: true,
      },
      include: [
        {
          local: ".gitlab/ci/prepare.yml",
          rules: [{ if: "$CI_COMMIT_BRANCH" }],
        },
        {
          remote: "https://example.com/ci.yml",
          integrity: "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
          rules: [{ exists: ["ci.yml"] }],
        },
        { template: "Nodejs.gitlab-ci.yml" },
        { project: "group/project", ref: "main", file: "templates/one.yml" },
        {
          project: "group/project",
          ref: "v1.2",
          file: ["templates/one.yml", "templates/two.yml"],
          rules: [
            {
              if: "$CI_COMMIT_BRANCH",
              changes: { paths: ["templates/**/*"], compare_to: "main" },
              when: "always",
            },
          ],
        },
        {
          component: "gitlab.com/components/danger@1.0",
          inputs: { job_name: "danger", stage: "test", blocking: false, retries: 2 },
          rules: [{ when: "never" }],
        },
      ],
      stages: ["build"],
      variables: { STABLE_VERSION: "1.5", PARALLEL: 4 },
      workflow: {
        name: "merge request",
        auto_cancel: { on_new_commit: "interruptible", on_job_failure: "all" },
        rules: [
          { if: '$CI_PIPELINE_SOURCE == "merge_request_event"' },
          {
            exists: ["Dangerfile"],
            when: "always",
            variables: { DEPLOY: "true", SHARDS: 4 },
          },
        ],
      },
      templates: { ".setup": { script: ["npm ci"] } },
      // Both script shapes, because a sequence adds a path of its own to the modelled set.
      jobs: [
        job({
          name: "build",
          stage: "build",
          variables: { GOFLAGS: "-mod=readonly" },
          script: "npm run build",
        }),
        job({
          name: "test",
          stage: "build",
          variables: { CGO_ENABLED: 0 },
          script: ["npm ci", "npm test"],
        }),
      ],
    }),
  },
  {
    name: "shapes",
    pipeline: pipeline({
      default: {
        image: "golang:1.26",
        services: ["docker:24.0.7-dind"],
        before_script: ["echo one"],
        after_script: "echo after",
        cache: { key: { files: ["go.sum"] }, paths: [".cache/go"] },
        retry: 2,
      },
      include: { local: ".gitlab/ci/test.yml" },
      jobs: [job({ name: "release", stage: "build", script: "make release" })],
    }),
  },
];
