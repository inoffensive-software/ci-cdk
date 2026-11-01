import { type Pipeline, job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";
import { ALTERNATE_DOCUMENTS } from "./inventory-shapes.js";
import { MAIN_SECRETS } from "./inventory-secrets.js";

/** One inventory document: a definition, plus the name a failure should use for it. */
export interface InventoryDocument {
  readonly name: string;
  readonly pipeline: Pipeline;
}

/**
 * The definitions that between them exercise every key the vocabulary can emit, and nothing else.
 * The gate renders each one and unions the key paths, so this file is the single definition of
 * "modelled". It must not use `raw`: a key it cannot reach through a field is a vocabulary gap.
 *
 * The second document exists because several fields accept two shapes, and each shape adds paths of
 * its own: a single `include` entry is a map, a single `cache` is a map, a retry count is a scalar,
 * and an image or service can be a bare string. The hidden template is here to prove the gate's
 * treatment of author data: its keys are `.`-prefixed at the document root and therefore never enter
 * the modelled set.
 */
export const INVENTORY: readonly InventoryDocument[] = [
  ...ALTERNATE_DOCUMENTS,
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
        hooks: {
          pre_get_sources_script: ['git config --global url."https://".insteadOf "ssh://"'],
        },
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
          extends: ".go-cache",
          needs: [
            "prepare",
            { job: "lint", optional: true, artifacts: false },
            {
              job: "test",
              artifacts: true,
              parallel: {
                matrix: [
                  { GO_VERSION: "1.26", SHARD: 1 },
                  { GO_VERSION: "1.27", SHARD: 2 },
                ],
              },
            },
          ],
          rules: [
            { if: "$CI_COMMIT_TAG", when: "never" },
            {
              if: "$CI_COMMIT_BRANCH",
              changes: { paths: ["src/**/*", "go.mod"], compare_to: "main" },
              exists: ["Dockerfile"],
              when: "manual",
              allow_failure: true,
              variables: { DEPLOY: "true", SHARDS: 4 },
              needs: ["prepare", "lint"],
            },
            { changes: ["docs/**/*"] },
          ],
          tags: ["gitlab-org", "docker"],
          image: { name: "golang:1.26", entrypoint: [""], pull_policy: "never" },
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
          variables: { GOFLAGS: "-mod=readonly" },
          inherit: { default: ["image", "cache"], variables: true },
          dependencies: ["prepare", "lint"],
          hooks: { pre_get_sources_script: ["git submodule update --init"] },
          dast_configuration: { site_profile: "production site", scanner_profile: "full scan" },
          secrets: MAIN_SECRETS,
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
            reports: { junit: "report.xml", codequality: "gl-code-quality-report.json" },
          },
          before_script: "echo before",
          script: "npm run build",
          after_script: ["echo one", "echo two"],
          environment: {
            name: "production",
            url: "https://example.com",
            action: "start",
            on_stop: "stop-production",
            auto_stop_in: "1 week",
            deployment_tier: "production",
          },
          release: {
            tag_name: "$CI_COMMIT_TAG",
            description: "Release $CI_COMMIT_TAG",
            name: "Release $CI_COMMIT_TAG",
            ref: "main",
            milestones: ["v1.0"],
            released_at: "2026-01-01T00:00:00Z",
          },
          trigger: {
            project: "group/downstream",
            branch: "main",
            strategy: "depend",
            inputs: { DEPLOY_ENV: "staging", RETRIES: 2 },
          },
          parallel: {
            matrix: [
              { GO_VERSION: "1.26", SHARD: 1 },
              { GO_VERSION: "1.27", SHARD: 2, TAGS: ["a", "b"] },
            ],
          },
          retry: {
            max: 2,
            when: ["runner_system_failure", "stuck_or_timeout_failure"],
            exit_codes: [137],
          },
          timeout: "1h 30m",
          interruptible: true,
          allow_failure: { exit_codes: [1, 137] },
          when: "manual",
          resource_group: "deploy",
          coverage: "/Coverage: \\d+\\.\\d+/",
        }),
        job({
          name: "test",
          stage: "build",
          extends: [".go-cache", ".setup"],
          tags: ["docker"],
          image: "golang:1.26",
          services: ["postgres:16"],
          variables: { CGO_ENABLED: 0 },
          cache: {
            key: { files: ["go.sum"], prefix: "go-" },
            paths: [".cache/go"],
            policy: "push",
            untracked: false,
            when: "always",
            fallback_keys: ["go-fallback"],
          },
          before_script: ["npm ci"],
          script: ["npm ci", "npm test"],
          after_script: "echo after",
        }),
      ],
    }),
  },
];
