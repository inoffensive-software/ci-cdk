import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import type { Value } from "../core/index.js";
import { type Job, type Pipeline, job, pipeline, render } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

/** One job, so each field reads as the body it produces rather than as a whole document. */
const body = (fields: Omit<Job, "name">): Readonly<Record<string, Value>> =>
  parse(bare(pipeline({ jobs: [job({ name: "deploy", ...fields })] }))).deploy;

const keysOf = (value: Value | undefined): readonly string[] =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? Object.keys(value) : [];

const PROVIDER_SECRETS = {
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
} satisfies NonNullable<Job["secrets"]>;

describe("job secrets", () => {
  it("writes every provider shape as documented", () => {
    expect(body({ script: "./deploy.sh", secrets: PROVIDER_SECRETS })["secrets"]).toStrictEqual(
      PROVIDER_SECRETS,
    );
  });

  it("keeps the author's secret order and omits absent provider keys", () => {
    const parsed = body({
      secrets: {
        FIRST: { vault: "one", file: true },
        SECOND: { azure_key_vault: { name: "two" } },
      },
    });

    expect(keysOf(parsed["secrets"])).toStrictEqual(["FIRST", "SECOND"]);
    expect(parsed["secrets"]).toStrictEqual({
      FIRST: { vault: "one", file: true },
      SECOND: { azure_key_vault: { name: "two" } },
    });
  });

  it("emits no secrets key when the field is absent", () => {
    expect(Object.keys(body({ script: "true" }))).toStrictEqual(["script"]);
  });
});

describe("job secrets position", () => {
  it("writes secrets after variables and before cache in the fixed job order", () => {
    const parsed = parse(
      bare(
        pipeline({
          jobs: [
            job({
              name: "deploy",
              stage: "deploy",
              script: "true",
              secrets: { TOKEN: { vault: "secret" } },
              variables: { A: "b" },
              cache: { paths: [".cache"] },
            }),
          ],
        }),
      ),
    );

    expect(Object.keys(parsed.deploy)).toStrictEqual([
      "stage",
      "variables",
      "secrets",
      "cache",
      "script",
    ]);
  });
});
