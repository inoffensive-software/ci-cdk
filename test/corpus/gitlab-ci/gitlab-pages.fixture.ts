import { type Pipeline, job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

/**
 * The definition `gitlab-pages.yml` must reproduce. It lives beside the test so the coverage-debt
 * ledger can import it and walk every fixture in one place.
 *
 * The file is include-heavy: two local includes, a component include guarded by its own `rules`,
 * `workflow` rules and `default` image/tags. Its one job extends the hidden `.common` template, which
 * carries `variables` and a pull-only `cache`, and overrides the cache with a push policy keyed on the
 * module files. `.common` is author data and goes through `templates`, never a raw job.
 *
 * Entries are compared semantically, so a fixture may write a scalar or a collection how the DSL
 * prefers. Where the vocabulary models a key, a fixture uses that field rather than `raw`.
 */
export const GITLAB_PAGES: Pipeline = pipeline({
  stages: ["prepare", "test"],
  templates: {
    ".common": {
      variables: {
        GOPATH: "$CI_PROJECT_DIR/.GOPATH",
      },
      cache: {
        paths: [".GOPATH/pkg/mod/"],
        policy: "pull",
      },
    },
  },
  jobs: [
    job({
      name: "download deps",
      script: ["make deps-download"],
      raw: {
        needs: [],
        extends: ".common",
        cache: {
          key: {
            files: ["go.mod", "go.sum"],
          },
          paths: [".GOPATH/pkg/mod/"],
          policy: "push",
        },
      },
    }),
  ],
  workflow: {
    rules: [
      { if: "$CI_MERGE_REQUEST_IID" },
      { if: "$CI_COMMIT_BRANCH == $CI_DEFAULT_BRANCH" },
      { if: "$CI_COMMIT_TAG" },
      { if: "$CI_COMMIT_BRANCH =~ /^[\\d-]+-stable(-ee)?$/" },
      { if: "$CI_COMMIT_BRANCH =~ /^security\\//" },
    ],
  },
  include: [
    { local: ".gitlab/ci/prepare.yml" },
    { local: ".gitlab/ci/test.yml" },
    {
      component: "${CI_SERVER_FQDN}/gitlab-org/components/danger-review/danger-review@2.1.0",
      rules: [
        {
          if: '$CI_SERVER_HOST == "gitlab.com" && $CI_PROJECT_PATH == "gitlab-org/gitlab-pages"',
        },
        {
          if: '$CI_SERVER_HOST == "gitlab.com" && $CI_PROJECT_PATH == "gitlab-org/security/gitlab-pages"',
        },
      ],
    },
  ],
  default: {
    image: "golang:1.26",
    tags: ["gitlab-org"],
  },
});
