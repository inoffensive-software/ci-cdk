import {
  DOC,
  entry,
  fromValue,
  map,
  present,
  type Doc,
  type LeafNode,
  type Text,
} from "../core/index.js";
import type {
  AwsSecretsManager,
  AzureKeyVault,
  GcpSecretManager,
  GitlabSecretsManager,
  Secret,
  Secrets,
  VaultSecret,
} from "./secret-types.js";

/** A leaf decides its own style; every other object here is one of the provider's own shapes. */
const isLeaf = <T extends object>(value: LeafNode | T): value is LeafNode =>
  Object.hasOwn(value, DOC);

const vaultEngineDoc = (engine: VaultSecret["engine"]): Doc =>
  map([
    { key: "name", value: fromValue(engine.name) },
    { key: "path", value: fromValue(engine.path) },
  ]);

/** A Vault secret keeps its shorthand string; the map form carries `engine`, `path` and `field`. */
const vaultDoc = (vault: Text | VaultSecret): Doc =>
  typeof vault === "string" || isLeaf(vault)
    ? fromValue(vault)
    : map([
        { key: "engine", value: vaultEngineDoc(vault.engine) },
        { key: "path", value: fromValue(vault.path) },
        { key: "field", value: fromValue(vault.field) },
      ]);

const gcpSecretManagerDoc = (secret: GcpSecretManager): Doc =>
  map([
    { key: "name", value: fromValue(secret.name) },
    ...entry("version", present(secret.version)),
  ]);

const azureKeyVaultDoc = (secret: AzureKeyVault): Doc =>
  map([
    { key: "name", value: fromValue(secret.name) },
    ...entry("version", present(secret.version)),
  ]);

/** An AWS secret keeps its shorthand string; the map form is emitted in the documented key order. */
const awsSecretsManagerDoc = (secret: Text | AwsSecretsManager): Doc =>
  typeof secret === "string" || isLeaf(secret)
    ? fromValue(secret)
    : map([
        { key: "secret_id", value: fromValue(secret.secret_id) },
        ...entry("version_id", present(secret.version_id)),
        ...entry("version_stage", present(secret.version_stage)),
        ...entry("region", present(secret.region)),
        ...entry("role_arn", present(secret.role_arn)),
        ...entry("role_session_name", present(secret.role_session_name)),
        ...entry("field", present(secret.field)),
      ]);

const gitlabSecretsManagerDoc = (secret: GitlabSecretsManager): Doc =>
  map([{ key: "name", value: fromValue(secret.name) }, ...entry("source", present(secret.source))]);

/**
 * One secret, in the schema's provider order: the provider that resolves it, then `file` and
 * `token`. Exactly one provider is expected; nothing is resolved or checked here.
 */
const secretDoc = (secret: Secret): Doc =>
  map([
    ...entry("vault", secret.vault === undefined ? undefined : vaultDoc(secret.vault)),
    ...entry(
      "gcp_secret_manager",
      secret.gcp_secret_manager === undefined
        ? undefined
        : gcpSecretManagerDoc(secret.gcp_secret_manager),
    ),
    ...entry(
      "azure_key_vault",
      secret.azure_key_vault === undefined ? undefined : azureKeyVaultDoc(secret.azure_key_vault),
    ),
    ...entry(
      "aws_secrets_manager",
      secret.aws_secrets_manager === undefined
        ? undefined
        : awsSecretsManagerDoc(secret.aws_secrets_manager),
    ),
    ...entry(
      "gitlab_secrets_manager",
      secret.gitlab_secrets_manager === undefined
        ? undefined
        : gitlabSecretsManagerDoc(secret.gitlab_secrets_manager),
    ),
    ...entry("file", present(secret.file)),
    ...entry("token", present(secret.token)),
  ]);

/** The author-named secret map, in record order; each secret lowers its own provider shape. */
export const secretsDoc = (secrets: Secrets): Doc =>
  map(Object.entries(secrets).map(([key, secret]) => ({ key, value: secretDoc(secret) })));
