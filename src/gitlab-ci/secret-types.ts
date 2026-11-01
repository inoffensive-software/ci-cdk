import type { Text } from "../core/index.js";

/**
 * The `engine` of a Vault secret: the mount's engine name and path. GitLab's default is `kv-v2`;
 * an engine section is how a job selects `kv-v1`, `generic` or another engine.
 */
export interface VaultSecretEngine {
  readonly name: Text;
  readonly path: Text;
}

/** A Vault secret in the long form: the engine to read, the secret path and the field to take. */
export interface VaultSecret {
  readonly engine: VaultSecretEngine;
  readonly path: Text;
  readonly field: Text;
}

/** A GCP Secret Manager secret. `version` defaults to `latest`; GitLab accepts a number or a label. */
export interface GcpSecretManager {
  readonly name: Text;
  readonly version?: Text | number;
}

/** An Azure Key Vault secret, optionally pinned to a version GUID. */
export interface AzureKeyVault {
  readonly name: Text;
  readonly version?: Text;
}

/**
 * An AWS Secrets Manager secret in its map form. Every field except `secret_id` overrides the
 * job's `AWS_*` variables for this secret alone.
 */
export interface AwsSecretsManager {
  readonly secret_id: Text;
  readonly version_id?: Text;
  readonly version_stage?: Text;
  readonly region?: Text;
  readonly role_arn?: Text;
  readonly role_session_name?: Text;
  readonly field?: Text;
}

/** A GitLab Secrets Manager secret, from the current project or from a group via `source`. */
export interface GitlabSecretsManager {
  readonly name: Text;
  readonly source?: Text;
}

/**
 * One entry of a job's `secrets`: the environment variable GitLab fills is the map key, and exactly
 * one provider supplies its value. `token` names the ID token used for authentication; `file`
 * decides whether the value is written to a temporary file (the default) or exported directly.
 */
export interface Secret {
  readonly vault?: Text | VaultSecret;
  readonly gcp_secret_manager?: GcpSecretManager;
  readonly azure_key_vault?: AzureKeyVault;
  readonly aws_secrets_manager?: Text | AwsSecretsManager;
  readonly gitlab_secrets_manager?: GitlabSecretsManager;
  readonly file?: boolean;
  readonly token?: Text;
}

/** The author-named map `secrets` takes: variable names in insertion order. */
export type Secrets = Readonly<Record<string, Secret>>;
