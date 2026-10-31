import { type Job, type Pipeline, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

/**
 * The alternate field shapes of the root pages job. A pipeline has one `pages` entry, so the shapes
 * that a second document already exercises for a job (a script sequence, a single cache map, an
 * `extends` list, a child trigger's include list) are exercised again here for `pages`.
 */
export const PAGES_JOB: Pipeline = pipeline({
  pages: {
    stage: "deploy",
    extends: [".pages-base", ".setup"],
    before_script: ["echo one"],
    script: ["npm ci", "npm run build"],
    cache: {
      key: { files: ["package-lock.json"], prefix: "pages-" },
      paths: [".npm"],
      policy: "push",
      untracked: false,
      when: "always",
      fallback_keys: ["pages-main"],
    },
    trigger: {
      include: [
        { local: ".gitlab/ci/child.yml" },
        { project: "group/child", ref: "main", file: "ci/child.yml" },
        { component: "gitlab.com/components/child@1.0", inputs: { CHILD_ENV: "staging" } },
      ],
      strategy: "mirror",
    },
  },
  jobs: [],
});

/** The two include forms a three-entry trigger cannot also carry. */
export const PAGES_TRIGGER: Pipeline = pipeline({
  pages: {
    trigger: {
      include: [{ template: "Child.yml" }, { remote: "https://example.com/child.yml" }],
    },
  },
  jobs: [],
});

export const MODELLED_JOB: Omit<Job, "name"> = {
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
};
