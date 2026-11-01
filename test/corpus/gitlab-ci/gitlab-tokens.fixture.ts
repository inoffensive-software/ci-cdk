import { type Pipeline, job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

/**
 * The definition `gitlab-tokens.yml` must reproduce. It lives beside the test so the coverage-debt
 * ledger can import it and walk every fixture in one place.
 *
 * No redistributable config found for this keyword uses both levels, so the file is
 * documentation-derived: the `default:id_tokens`, job `id_tokens` with one and several audiences,
 * and `identity: google_cloud` shapes are copied from the GitLab pages named in `PROVENANCE.md`.
 * It pins the shapes, not usage in the wild.
 */
export const GITLAB_TOKENS: Pipeline = pipeline({
  stages: ["deploy"],
  default: {
    id_tokens: {
      DEFAULT_ID_TOKEN: { aud: "https://vault.example.com" },
    },
  },
  jobs: [
    job({
      name: "deploy",
      stage: "deploy",
      script: ["./deploy.sh"],
      id_tokens: {
        VAULT_ID_TOKEN: { aud: "https://vault.example.com" },
        CLOUD_ID_TOKEN: { aud: ["https://gcp.example.com", "https://aws.example.com"] },
      },
      identity: "google_cloud",
    }),
  ],
});
