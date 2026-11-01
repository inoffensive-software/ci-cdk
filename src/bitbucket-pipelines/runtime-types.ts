import type { Text } from "../core/index.js";

/** An ECR image pulled with an assumed role rather than static credentials. */
export interface ImageAwsRole {
  readonly "oidc-role": Text;
}

/** An ECR image pulled with a static access-key pair. */
export interface ImageAwsKeys {
  readonly "access-key": Text;
  readonly "secret-key": Text;
}

/** The two ways the schema authenticates an ECR pull: an assumed role, or a key pair. */
export type ImageAws = ImageAwsRole | ImageAwsKeys;

/** The cloud runner settings a step or the whole pipeline can select. */
export interface CloudRuntime {
  readonly arch?: "x86" | "arm";
  readonly "atlassian-ip-ranges"?: boolean;
  readonly "instance-type"?: Text;
  readonly platform?: "linux" | "windows";
  readonly version?: Text;
}

/** An S3-backed self-hosted runner store that assumes a role. */
export interface AwsStorageRole {
  readonly bucket: Text;
  readonly region: Text;
  readonly "oidc-role": Text;
}

/** An S3-backed self-hosted runner store with a static access-key pair. */
export interface AwsStorageKeys {
  readonly bucket: Text;
  readonly region: Text;
  readonly "access-key": Text;
  readonly "secret-key": Text;
}

/** The schema's two AWS storage authentication arms. */
export type AwsStorage = AwsStorageRole | AwsStorageKeys;

/** A GCS-backed self-hosted runner store. */
export interface GcpStorage {
  readonly bucket: Text;
  readonly "key-file": Text;
}

/** Where a self-hosted runner keeps its shared storage; the schema allows one provider. */
export interface RuntimeStorage {
  readonly aws?: AwsStorage;
  readonly gcp?: GcpStorage;
}

/** The self-hosted runner's size, storage and mounted volumes. */
export interface SelfHostedRuntime {
  readonly cpu?: number;
  readonly memory?: number;
  readonly storage?: RuntimeStorage;
  readonly volumes?: readonly Text[];
}

/** A step or pipeline runtime: the cloud runner, the self-hosted runner, or both. */
export interface Runtime {
  readonly cloud?: CloudRuntime;
  readonly "self-hosted"?: SelfHostedRuntime;
}
