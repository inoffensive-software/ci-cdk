import { entry, fromValue, map, type Doc } from "../core/index.js";
import type {
  AwsStorage,
  CloudRuntime,
  GcpStorage,
  Runtime,
  RuntimeStorage,
  SelfHostedRuntime,
} from "./runtime-types.js";

/** An AWS storage map: `access-key`, `bucket`, `oidc-role`, `region`, `secret-key`. */
const awsStorageDoc = (aws: AwsStorage): Doc =>
  map([
    ...entry("access-key", "access-key" in aws ? fromValue(aws["access-key"]) : undefined),
    { key: "bucket", value: fromValue(aws.bucket) },
    ...entry("oidc-role", "oidc-role" in aws ? fromValue(aws["oidc-role"]) : undefined),
    { key: "region", value: fromValue(aws.region) },
    ...entry("secret-key", "secret-key" in aws ? fromValue(aws["secret-key"]) : undefined),
  ]);

/** A GCP storage map: `bucket` then `key-file`. */
const gcpStorageDoc = (gcp: GcpStorage): Doc =>
  map([
    { key: "bucket", value: fromValue(gcp.bucket) },
    { key: "key-file", value: fromValue(gcp["key-file"]) },
  ]);

/** Runtime storage: `aws` then `gcp`, whichever arm the author set. */
const storageDoc = (storage: RuntimeStorage): Doc =>
  map([
    ...entry("aws", storage.aws === undefined ? undefined : awsStorageDoc(storage.aws)),
    ...entry("gcp", storage.gcp === undefined ? undefined : gcpStorageDoc(storage.gcp)),
  ]);

/** A self-hosted runtime: `cpu`, `memory`, `storage`, `volumes`. */
const selfHostedDoc = (runtime: SelfHostedRuntime): Doc =>
  map([
    ...entry("cpu", runtime.cpu === undefined ? undefined : fromValue(runtime.cpu)),
    ...entry("memory", runtime.memory === undefined ? undefined : fromValue(runtime.memory)),
    ...entry("storage", runtime.storage === undefined ? undefined : storageDoc(runtime.storage)),
    ...entry("volumes", runtime.volumes === undefined ? undefined : fromValue(runtime.volumes)),
  ]);

/** A cloud runtime: `arch`, `atlassian-ip-ranges`, `instance-type`, `platform`, `version`. */
const cloudDoc = (cloud: CloudRuntime): Doc =>
  map([
    ...entry("arch", cloud.arch === undefined ? undefined : fromValue(cloud.arch)),
    ...entry(
      "atlassian-ip-ranges",
      cloud["atlassian-ip-ranges"] === undefined
        ? undefined
        : fromValue(cloud["atlassian-ip-ranges"]),
    ),
    ...entry(
      "instance-type",
      cloud["instance-type"] === undefined ? undefined : fromValue(cloud["instance-type"]),
    ),
    ...entry("platform", cloud.platform === undefined ? undefined : fromValue(cloud.platform)),
    ...entry("version", cloud.version === undefined ? undefined : fromValue(cloud.version)),
  ]);

/** A runtime: `cloud` then `self-hosted`. An absent runner is not emitted. */
export const runtimeDoc = (runtime: Runtime | undefined): Doc | undefined => {
  if (runtime === undefined) {
    return undefined;
  }

  return map([
    ...entry("cloud", runtime.cloud === undefined ? undefined : cloudDoc(runtime.cloud)),
    ...entry(
      "self-hosted",
      runtime["self-hosted"] === undefined ? undefined : selfHostedDoc(runtime["self-hosted"]),
    ),
  ]);
};
