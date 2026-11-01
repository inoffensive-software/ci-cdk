import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Job, type Pipeline, job, pipeline, render } from "./index.js";

/** Header suppressed, the way every golden except the default-header one renders. */
const bare = (value: Pipeline): string => render(value, { header: "" });

/** Every `secrets` provider shape and both shorthand forms, in one block. */
const SECRETS = {
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
    gcp_secret_manager: {
      name: "projects/123456789/secrets/my-project-secret",
      version: 1,
    },
    token: "$GCP_ID_TOKEN",
  },
  AZURE_SECRET: {
    azure_key_vault: {
      name: "DATABASE-PASSWORD",
      version: "00000000000000000000000000000000",
    },
    token: "$AZURE_JWT",
  },
  AWS_SHORTHAND: { aws_secrets_manager: "app-secrets/api#api_key", file: false },
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
} satisfies NonNullable<Job["secrets"]>;

/** The block in a job, so the field's fixed position and each provider's key order are pinned. */
const secretsPipeline = (): Pipeline =>
  pipeline({
    stages: ["deploy"],
    jobs: [
      job({
        name: "deploy",
        stage: "deploy",
        variables: { TARGET: "production" },
        secrets: SECRETS,
        cache: { paths: [".cache"] },
        script: "./deploy.sh",
      }),
    ],
  });

describe("format lock: job secrets", () => {
  it("pins every provider shape and the field's fixed position", async () => {
    await expect(bare(secretsPipeline())).toMatchFileSnapshot("./__snapshots__/format-secrets.yml");
  });

  it("emits secrets after variables and before cache", () => {
    expect(Object.keys(parse(bare(secretsPipeline())).deploy)).toStrictEqual([
      "stage",
      "variables",
      "secrets",
      "cache",
      "script",
    ]);
  });
});
