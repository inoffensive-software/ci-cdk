import { type Pipeline, job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

/**
 * The definition `small-deferred.yml` must reproduce. The file is documentation-derived rather than
 * vendored from a repository, so it pins shapes rather than evidence: `inherit` in both selector
 * forms, job and default `hooks`, `dependencies`, `start_in`, `manual_confirmation` and
 * `dast_configuration`, written as GitLab's CI/CD YAML reference documents them.
 */
export const SMALL_DEFERRED: Pipeline = pipeline({
  stages: ["build", "deploy"],
  default: {
    hooks: { pre_get_sources_script: ["echo default hook"] },
  },
  jobs: [
    job({
      name: "build",
      stage: "build",
      script: "echo build",
      inherit: { default: ["image", "cache"], variables: true },
      dependencies: ["prepare"],
      hooks: { pre_get_sources_script: "echo job hook" },
    }),
    job({
      name: "deploy",
      stage: "deploy",
      script: "echo deploy",
      when: "delayed",
      start_in: "1 hour",
      inherit: { default: false, variables: ["DEPLOY"] },
    }),
    job({
      name: "confirm",
      stage: "deploy",
      script: "echo confirm",
      when: "manual",
      manual_confirmation: "Deploy to production?",
    }),
    job({
      name: "dast",
      stage: "build",
      script: "echo dast",
      dast_configuration: { site_profile: "production site", scanner_profile: "full scan" },
    }),
  ],
});
