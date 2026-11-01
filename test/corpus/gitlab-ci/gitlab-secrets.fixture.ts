import { type Pipeline, job, pipeline } from "@inoffensive/ci-cdk/gitlab-ci";

/**
 * The definition `gitlab-secrets.yml` must reproduce. It lives beside the test so the
 * coverage-debt ledger can import it and walk every fixture in one place.
 *
 * No redistributable config found for this keyword uses every provider, so the file is
 * documentation-derived: each shape below is copied from the GitLab provider pages named in
 * `PROVENANCE.md`, with no key the docs do not show. It pins the shapes, not usage in the wild.
 */
export const GITLAB_SECRETS: Pipeline = pipeline({
  stages: ["deploy"],
  jobs: [
    job({
      name: "deploy",
      stage: "deploy",
      script: ["./deploy.sh"],
      secrets: {
        VAULT_SHORTHAND: {
          vault: "production/db/password@ops",
          file: false,
          token: "$VAULT_ID_TOKEN",
        },
        VAULT_ENGINE: {
          vault: {
            engine: { name: "generic", path: "artifactory" },
            path: "production/jfrog",
            field: "access_token",
          },
          file: false,
        },
        GCP_SECRET: {
          gcp_secret_manager: { name: "projects/123456789/secrets/my-project-secret", version: 1 },
          token: "$GCP_ID_TOKEN",
        },
        AZURE_SECRET: {
          azure_key_vault: {
            name: "DATABASE-PASSWORD",
            version: "00000000000000000000000000000000",
          },
          token: "$AZURE_JWT",
        },
        AWS_SHORTHAND: {
          aws_secrets_manager: "app-secrets/api#api_key",
          file: false,
        },
        AWS_MAP: {
          aws_secrets_manager: {
            secret_id: "app-secrets/database",
            version_id: "01234567-89ab-cdef-0123-456789abcdef",
            version_stage: "AWSCURRENT",
            region: "eu-west-1",
            role_arn: "arn:aws:iam::123456789012:role/eu-deployment-role",
            role_session_name: "gitlab-eu-deployment",
            field: "password",
          },
          token: "$AWS_ID_TOKEN",
          file: false,
        },
        GITLAB_SECRET: {
          gitlab_secrets_manager: { name: "kube_cert", source: "group/my-group/my-subgroup" },
        },
      },
    }),
  ],
});
