import { type Pipeline, job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

/**
 * The definition `gitlab-run.yml` must reproduce. The file is documentation-derived rather than
 * vendored from a repository: it pins the step-list shapes GitLab's Functions page documents, so the
 * vocabulary does not guess at deployment or Functions grammar. A function step carries `inputs` and
 * `env`; a script step is the documented escape hatch and carries only `env`.
 */
export const GITLAB_RUN: Pipeline = pipeline({
  stages: ["build"],
  jobs: [
    job({
      name: "build_and_release",
      stage: "build",
      run: [
        {
          name: "validate",
          func: "registry.gitlab.com/js/validate:1.0.0",
          env: { BUILD_TARGET: "release" },
        },
        {
          name: "release",
          func: "registry.gitlab.com/js/release:1.0.0",
          inputs: { environment: "production", retries: 2 },
        },
        {
          name: "migrate",
          script: "npm run migrate",
          env: { DRY_RUN: "false" },
        },
      ],
    }),
  ],
});
