import { type Pipeline, job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

/**
 * The definition `gitlab-pages-job.yml` must reproduce. The file is documentation-derived rather
 * than vendored: no pinned repository config used the job-level `pages` keyword, so both documented
 * shapes are copied from GitLab's syntax reference. `pages` is a flag or a map of `publish`,
 * `path_prefix` and `expire_in`; the job that publishes sits beside an ordinary job so the keyword
 * reads as part of a job body, not as a pipeline field.
 */
export const GITLAB_PAGES_JOB: Pipeline = pipeline({
  stages: ["deploy"],
  jobs: [
    job({
      name: "publish_site",
      stage: "deploy",
      script: ["npm run build"],
      artifacts: { paths: ["public/"] },
      pages: {
        publish: "public/",
        path_prefix: "handbook",
        expire_in: "1 month",
      },
    }),
    job({
      name: "publish_flag",
      stage: "deploy",
      script: ["npm run build"],
      artifacts: { paths: ["public/"] },
      pages: true,
    }),
  ],
});
