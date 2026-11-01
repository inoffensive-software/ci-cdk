import type { Job } from "@inoffensive/ci-cdk/gitlab-ci";

/**
 * The `secrets` block the main inventory job emits. It lives beside the inventory so that file stays
 * within its size budget; every provider key is present, in both shorthand and map form, and no key
 * is written through `raw`.
 */
export const MAIN_SECRETS: NonNullable<Job["secrets"]> = {
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
  },
  GCP_SECRET: {
    gcp_secret_manager: { name: "my-project-secret", version: 1 },
    token: "$GCP_ID_TOKEN",
  },
  AZURE_SECRET: {
    azure_key_vault: {
      name: "DATABASE-PASSWORD",
      version: "00000000000000000000000000000000",
    },
  },
  AWS_SHORTHAND: { aws_secrets_manager: "app-secrets/api#api_key" },
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
  },
  GITLAB_SECRET: {
    gitlab_secrets_manager: { name: "kube_cert", source: "group/my-group/my-subgroup" },
  },
};
