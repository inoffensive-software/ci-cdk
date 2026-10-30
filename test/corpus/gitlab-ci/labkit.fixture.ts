import { type Pipeline, job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

/**
 * The definition `labkit.yml` must reproduce. It lives beside the test so the coverage-debt
 * ledger can import it and walk every fixture in one place.
 *
 * The vendored file is a fragment: `include` pulls in common-ci-tasks and the asdf versions,
 * and thirteen jobs only override a job an include defines, so they declare no `script` at
 * all. Every `!reference` tag is written as the array the YAML parser leaves behind, because
 * the tag is dropped by `parse`; PROVENANCE.md records the caveat.
 *
 * Entries are compared semantically, so a fixture may write a scalar or a collection how the DSL
 * prefers. Where the vocabulary models a key, a fixture uses that field rather than `raw`.
 *
 * It is longer than the lint line limit because it is one pinned document, transcribed; the file is
 * exempted in `.oxlintrc.json` rather than split, since a fixture is one file.
 */
export const LABKIT: Pipeline = pipeline({
  stages: ["prepare", "validate", "release", "renovate_bot"],
  templates: {
    ".go-cache": {
      variables: {
        GOMODCACHE: "$CI_PROJECT_DIR/.cache/go-mod",
        GOCACHE: "$CI_PROJECT_DIR/.cache/go-build",
      },
      cache: [
        {
          key: {
            files: ["go.sum", "v2/go.sum"],
          },
          paths: [".cache/go-mod"],
          policy: "pull",
        },
        {
          key: {
            files: ["go.sum", "v2/go.sum"],
            prefix: "gobuild-$CI_JOB_NAME_SLUG",
          },
          paths: [".cache/go-build"],
          policy: "pull-push",
        },
      ],
    },
    ".go-versions": ["1.25", "1.26", "1.27"],
    ".golang-fips-fork-versions": ["1.25", "1.26"],
    ".golang-fips-native-versions": ["1.27"],
    ".postgres-integration-trigger-paths": {
      changes: ["v2/postgres/**/*", "v2/go.mod", "v2/go.sum"],
    },
    ".redis-integration-trigger-paths": {
      changes: ["v2/redis/**/*", "v2/go.mod", "v2/go.sum"],
    },
    ".integration-redis-base": {
      extends: ".go-cache",
      image: "golang:${GL_ASDF_GOLANG_VERSION}",
      stage: "validate",
      variables: {
        REDIS_TEST_RUN: "TestIntegration_",
        REDIS_TEST_SKIP: "",
      },
      rules: [
        {
          if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH",
        },
        {
          if: "$CI_COMMIT_BRANCH",
          changes: [".redis-integration-trigger-paths", "changes"],
        },
        {
          if: '$CI_PIPELINE_SOURCE == "merge_request_event"',
          changes: [".redis-integration-trigger-paths", "changes"],
        },
      ],
      script: [
        'cd v2 && go test -v -tags integration -count=1 -timeout=60s -run "${REDIS_TEST_RUN}" ${REDIS_TEST_SKIP:+-skip "${REDIS_TEST_SKIP}"} ./redis/',
      ],
    },
    ".azure-integration-trigger-paths": {
      changes: ["v2/objectstore/**/*", "v2/go.mod", "v2/go.sum"],
    },
    ".conformance-trigger-paths": {
      changes: ["v2/**/*", ".gitlab-ci.yml"],
    },
    ".release-base": {
      stage: "release",
      rules: [
        {
          if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH",
        },
        {
          if: "$CI_COMMIT_TAG",
          when: "never",
        },
      ],
      before_script: [
        "apt-get update -qq && apt-get install -y -qq jq",
        'git remote set-url origin "https://gitlab-ci-token:${CI_JOB_TOKEN}@${CI_SERVER_HOST}/${CI_PROJECT_PATH}.git"',
      ],
    },
  },
  jobs: [
    job({
      name: "semantic_release_check",
      raw: {
        rules: [
          {
            when: "never",
          },
        ],
      },
    }),
    job({
      name: "semantic_release_dry_run",
      raw: {
        rules: [
          {
            when: "never",
          },
        ],
      },
    }),
    job({
      name: "semantic_release",
      raw: {
        rules: [
          {
            when: "never",
          },
        ],
      },
    }),
    job({
      name: "goreleaser_build",
      raw: {
        rules: [
          {
            when: "never",
          },
        ],
      },
    }),
    job({
      name: "goreleaser_validate",
      raw: {
        rules: [
          {
            when: "never",
          },
        ],
      },
    }),
    job({
      name: "go_unittests",
      raw: {
        rules: [
          {
            when: "never",
          },
        ],
      },
    }),
    job({
      name: "golangci_lint",
      raw: {
        rules: [
          {
            when: "never",
          },
        ],
      },
    }),
    job({
      name: "warm-go-mod-cache",
      stage: "prepare",
      script: ["go mod download", "cd v2 && go mod download"],
      raw: {
        variables: {
          GOMODCACHE: "$CI_PROJECT_DIR/.cache/go-mod",
        },
        cache: {
          key: {
            files: ["go.sum", "v2/go.sum"],
          },
          paths: [".cache/go-mod"],
          policy: "pull-push",
        },
      },
    }),
    job({
      name: "build",
      stage: "validate",
      script: ["./scripts/compile.sh"],
      raw: {
        extends: ".go-cache",
        image: "golang:${GO_VERSION}",
        parallel: {
          matrix: [
            {
              GO_VERSION: ["1.25", "1.26", "1.27"],
              BUILD_TAGS: [
                "tracer_static tracer_static_jaeger",
                "tracer_static tracer_static_lightstep",
                "tracer_static tracer_static_datadog",
                "tracer_static tracer_static_stackdriver",
                "tracer_static tracer_static_jaeger tracer_static_lightstep tracer_static_datadog tracer_static_stackdriver",
                "continuous_profiler_stackdriver",
              ],
            },
          ],
        },
      },
    }),
    job({
      name: "test",
      stage: "validate",
      script: ["./scripts/test.sh"],
      raw: {
        extends: ".go-cache",
        image: "golang:${GO_VERSION}",
        parallel: {
          matrix: [
            {
              GO_VERSION: ["1.25", "1.26", "1.27"],
              BUILD_TAGS: [
                "",
                "tracer_static tracer_static_jaeger tracer_static_lightstep tracer_static_datadog tracer_static_stackdriver",
                "continuous_profiler_stackdriver",
              ],
            },
          ],
        },
      },
    }),
    job({
      name: "lint",
      stage: "validate",
      script: ["./scripts/golangci-lint.sh"],
      raw: {
        extends: ".go-cache",
        image: {
          name: "${CI_REGISTRY}/gitlab-com/gl-infra/common-ci-tasks-images/golangci-lint:${GL_ASDF_GOLANGCI_LINT_VERSION}",
          entrypoint: ["/bin/bash", "-c"],
        },
        variables: {
          GOLANGCI_LINT_CACHE: "$CI_PROJECT_DIR/.cache/golangci-lint",
        },
        cache: [
          {
            key: {
              files: ["go.sum", "v2/go.sum"],
            },
            paths: [".cache/go-mod"],
            policy: "pull",
          },
          {
            key: {
              files: ["go.sum", "v2/go.sum"],
              prefix: "gobuild-$CI_JOB_NAME_SLUG",
            },
            paths: [".cache/go-build"],
            policy: "pull-push",
          },
          {
            key: {
              files: ["go.sum", "v2/go.sum"],
              prefix: "golangci-$CI_JOB_NAME_SLUG",
            },
            paths: [".cache/golangci-lint"],
            policy: "pull-push",
          },
        ],
        artifacts: {
          reports: {
            codequality: "gl-code-quality-report.json",
          },
        },
      },
    }),
    job({
      name: "go_mod_tidy",
      script: [
        "./scripts/go-mod-tidy.sh",
        "git diff --exit-code || { echo \"running 'go mod tidy' produced changes in root or v2 module.\"; echo \"please run './scripts/go-mod-tidy.sh' and commit the changes.\"; exit 1; }",
      ],
    }),
    job({
      name: "go-logging-field-validator",
      script: ["./scripts/validate-log-fields.sh"],
    }),
    job({
      name: "danger-review",
      raw: {
        rules: [
          {
            if: '$CI_PIPELINE_SOURCE == "merge_request_event" && $CI_MERGE_REQUEST_SOURCE_PROJECT_PATH == "gitlab-community/gitlab-org/labkit"',
            exists: ["Dangerfile"],
            allow_failure: true,
          },
          {
            if: '$CI_PIPELINE_SOURCE == "merge_request_event"',
            exists: ["Dangerfile"],
          },
        ],
      },
    }),
    job({
      name: "integration:postgres",
      stage: "validate",
      script: ["cd v2", "go test -v -tags integration -count=1 -timeout=60s ./postgres/"],
      raw: {
        extends: ".go-cache",
        image: "golang:${GL_ASDF_GOLANG_VERSION}",
        rules: [
          {
            if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH",
          },
          {
            if: "$CI_COMMIT_BRANCH",
            // `!reference [.postgres-integration-trigger-paths, changes]`: the tag is dropped by
            // `parse`, so the sequence the tag carried is the data.
            changes: [".postgres-integration-trigger-paths", "changes"],
          },
          {
            if: '$CI_PIPELINE_SOURCE == "merge_request_event"',
            changes: [".postgres-integration-trigger-paths", "changes"],
          },
        ],
        variables: {
          FF_NETWORK_PER_BUILD: 1,
          POSTGRES_DSN: "postgres://labkit:labkit@postgres:5432/labkit_test?sslmode=disable",
          PGBOUNCER_DSN: "postgres://labkit:labkit@pgbouncer:5432/labkit_test?sslmode=disable",
        },
        services: [
          {
            name: "postgres:18-alpine",
            alias: "postgres",
            variables: {
              POSTGRES_USER: "labkit",
              POSTGRES_PASSWORD: "labkit",
              POSTGRES_DB: "labkit_test",
            },
          },
          {
            name: "edoburu/pgbouncer:v1.23.1-p3",
            alias: "pgbouncer",
            variables: {
              DATABASE_URL: "postgres://labkit:labkit@postgres:5432/labkit_test",
              POOL_MODE: "transaction",
              MAX_CLIENT_CONN: 100,
              DEFAULT_POOL_SIZE: 20,
              AUTH_TYPE: "plain",
            },
          },
        ],
        before_script: [
          "apt-get update -qq && apt-get install -y -qq postgresql-client > /dev/null",
          'echo "Waiting for PostgreSQL..."\nfor i in $(seq 1 30); do\n  pg_isready -h postgres -p 5432 -U labkit -q && break\n  sleep 1\ndone\necho "Waiting for PgBouncer..."\nfor i in $(seq 1 30); do\n  pg_isready -h pgbouncer -p 5432 -U labkit -q && break\n  sleep 1\ndone\n',
        ],
      },
    }),
    job({
      name: "integration:redis",
      raw: {
        extends: ".integration-redis-base",
        variables: {
          REDIS_TEST_SKIP: "Cluster|Sentinel",
          REDIS_ADDR: "127.0.0.1:6379",
        },
        before_script: ["v2/redis/testdata/ci/setup-single.sh"],
      },
    }),
    job({
      name: "integration:redis:cluster",
      raw: {
        extends: ".integration-redis-base",
        variables: {
          REDIS_TEST_RUN: "Cluster",
          REDIS_CLUSTER_ADDRS: "127.0.0.1:7001,127.0.0.1:7002,127.0.0.1:7003",
        },
        before_script: ["v2/redis/testdata/ci/setup-cluster.sh"],
      },
    }),
    job({
      name: "integration:redis:sentinel",
      raw: {
        extends: ".integration-redis-base",
        variables: {
          REDIS_TEST_RUN: "Sentinel",
          REDIS_SENTINEL_ADDRS: "127.0.0.1:26379",
          REDIS_SENTINEL_MASTER: "mymaster",
        },
        before_script: ["v2/redis/testdata/ci/setup-sentinel.sh"],
      },
    }),
    job({
      name: "integration:azure",
      stage: "validate",
      script: [
        "cd v2",
        "go test -v -tags integration -count=1 -timeout=60s ./objectstore/providers/azure/",
      ],
      raw: {
        extends: ".go-cache",
        image: "golang:${GL_ASDF_GOLANG_VERSION}",
        rules: [
          {
            if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH",
          },
          {
            if: "$CI_COMMIT_BRANCH",
            changes: [".azure-integration-trigger-paths", "changes"],
          },
          {
            if: '$CI_PIPELINE_SOURCE == "merge_request_event"',
            changes: [".azure-integration-trigger-paths", "changes"],
          },
        ],
        variables: {
          FF_NETWORK_PER_BUILD: 1,
          OBJECTSTORE2_AZURE_CONNECTION_STRING:
            "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://azurite:10000/devstoreaccount1;",
          OBJECTSTORE2_AZURE_STORAGE_DOMAIN: "azurite:10000",
        },
        services: [
          {
            name: "mcr.microsoft.com/azure-storage/azurite:3.37.0",
            alias: "azurite",
            command: [
              "azurite-blob",
              "--blobHost",
              "0.0.0.0",
              "--blobPort",
              "10000",
              "--skipApiVersionCheck",
            ],
          },
        ],
        before_script: ["v2/objectstore/providers/azure/testdata/ci/wait-for-azurite.sh"],
      },
    }),
    job({
      name: "conformance-spec",
      stage: "validate",
      raw: {
        needs: [],
        variables: {
          LABKIT_SHA: "$CI_COMMIT_SHA",
        },
        rules: [
          {
            if: '$CI_PIPELINE_SOURCE == "merge_request_event"',
            changes: [".conformance-trigger-paths", "changes"],
          },
        ],
        trigger: {
          project: "gitlab-org/quality/tooling/labkit-spec",
          branch: "main",
          strategy: "depend",
        },
      },
    }),
    job({
      name: "test-fips",
      stage: "validate",
      script: ["./scripts/test.sh"],
      raw: {
        extends: ".go-cache",
        image:
          "${CI_REGISTRY}/gitlab-com/gl-infra/common-ci-tasks-images/golang-fips:${GO_FIPS_VERSION}",
        parallel: {
          matrix: [
            {
              GO_FIPS_VERSION: ["1.25", "1.26"],
              GOEXPERIMENT: "boringcrypto",
              GOFIPS140: "off",
            },
            {
              GO_FIPS_VERSION: ["1.27"],
              FIPS_EXPECT_NATIVE_MODULE: "1",
            },
          ],
        },
        variables: {
          BUILD_TAGS: "fips",
          CGO_ENABLED: 1,
          GOLANG_FIPS: 1,
          OPENSSL_FORCE_FIPS_MODE: 1,
        },
      },
    }),
    job({
      name: "test-fips-native",
      stage: "validate",
      script: ["./scripts/test.sh"],
      raw: {
        extends: ".go-cache",
        image: "golang:${GO_VERSION}",
        parallel: {
          matrix: [
            {
              GO_VERSION: ["1.25", "1.26", "1.27"],
            },
          ],
        },
        variables: {
          BUILD_TAGS: "fips",
          GOFIPS140: "v1.0.0",
          FIPS_EXPECT_NATIVE_MODULE: "1",
        },
      },
    }),
    job({
      name: "check-mock-files",
      stage: "validate",
      script: ["./scripts/check-mock-files.sh"],
      raw: {
        image: "golang:${GL_ASDF_GOLANG_VERSION}",
      },
    }),
    job({
      name: "check-go-version",
      stage: "validate",
      script: ["./scripts/check-go-version.sh"],
      raw: {
        image: "golang:${GL_ASDF_GOLANG_VERSION}",
        needs: [],
      },
    }),
    job({
      name: "markdownlint",
      raw: {
        needs: [],
      },
    }),
    job({
      name: "release-v1",
      script: ["./scripts/release.sh v1"],
      raw: {
        extends: ".release-base",
      },
    }),
    job({
      name: "release-v2",
      script: ["./scripts/release.sh v2"],
      raw: {
        extends: ".release-base",
      },
    }),
  ],
  raw: {
    default: {
      image: "golang:${GL_ASDF_GOLANG_VERSION}",
      tags: ["gitlab-org"],
    },
    workflow: {
      rules: [
        {
          if: '$CI_PIPELINE_SOURCE == "merge_request_event"',
        },
        {
          if: "$CI_COMMIT_BRANCH && $CI_OPEN_MERGE_REQUESTS",
          when: "never",
        },
        {
          if: "$CI_COMMIT_BRANCH",
        },
        {
          if: "$CI_COMMIT_TAG",
        },
      ],
    },
    include: [
      {
        local: ".gitlab-ci-asdf-versions.yml",
      },
      {
        project: "gitlab-com/gl-infra/common-ci-tasks",
        ref: "v5.23",
        file: "templates/standard.yml",
      },
      {
        project: "gitlab-com/gl-infra/common-ci-tasks",
        ref: "v5.23",
        file: "templates/golang.yml",
      },
      {
        component: "gitlab.com/gitlab-com/gl-infra/common-ci-tasks/danger@v5.23",
      },
      {
        component: "gitlab.com/components/markdownlint/markdownlint@2.1.0",
        inputs: {
          job_name: "markdownlint",
          stage: "validate",
        },
      },
    ],
    variables: {
      REPO_NAME: "gitlab.com/gitlab-org/labkit",
      SAST_EXCLUDED_ANALYZERS: "eslint,gosec,nodejs-scan",
    },
  },
});
