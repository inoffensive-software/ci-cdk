import type { Scalar, Text } from "../core/index.js";

/** The closed set GitLab documents for `image:pull_policy` and `services:pull_policy`. */
export type ImagePullPolicy = "always" | "if-not-present" | "never";

/** One pull policy, or several that the runner tries in the order written. */
export type PullPolicy = ImagePullPolicy | readonly ImagePullPolicy[];

/** The map form of an image: its name, an entrypoint, executor options and a pull policy. */
export interface ImageOptions {
  readonly name: Text;
  readonly entrypoint?: readonly Text[];
  readonly docker?: DockerOptions;
  readonly kubernetes?: KubernetesOptions;
  readonly pull_policy?: PullPolicy;
}

/** A Docker image, as its name or as the map GitLab also accepts. */
export type Image = Text | ImageOptions;

/** The map form of a service: its name, alias, executor options, entrypoint, command and variables. */
export interface ServiceOptions {
  readonly name: Text;
  readonly alias?: Text;
  readonly docker?: DockerOptions;
  readonly kubernetes?: KubernetesOptions;
  readonly entrypoint?: readonly Text[];
  readonly command?: readonly Text[];
  readonly variables?: Readonly<Record<string, Scalar>>;
  readonly pull_policy?: PullPolicy;
}

/** A linked service container, as its name or as the map GitLab also accepts. */
export type Service = Text | ServiceOptions;

/** Docker-executor options: the architecture to pull and the user to run the container as. */
export interface DockerOptions {
  readonly platform?: Text;
  readonly user?: Text;
}

/** Kubernetes-executor options: the user to run as, as a UID or a `UID:GID` pair. */
export interface KubernetesOptions {
  readonly user?: Text | number;
}

/** Whether GitLab manages the Kubernetes resources for this environment. */
export interface EnvironmentManagedResources {
  readonly enabled?: boolean;
}

/** The Kubernetes dashboard GitLab deploys for this environment. */
export interface EnvironmentDashboard {
  readonly namespace?: Text;
  readonly flux_resource_path?: Text;
}

/**
 * The Kubernetes half of an environment: the GitLab agent that owns it, the managed resources, and
 * the dashboard. `namespace` and `flux_resource_path` are deprecated in favour of the dashboard's
 * copies, but GitLab still reads them, so both spellings are modelled.
 */
export interface EnvironmentKubernetes {
  readonly agent?: Text;
  /** Deprecated: use `dashboard.namespace`. */
  readonly namespace?: Text;
  /** Deprecated: use `dashboard.flux_resource_path`. */
  readonly flux_resource_path?: Text;
  readonly managed_resources?: EnvironmentManagedResources;
  readonly dashboard?: EnvironmentDashboard;
}

/** The map form of `environment`: a deployment target with its URL and lifecycle hooks. */
export interface EnvironmentOptions {
  readonly name: Text;
  readonly url?: Text;
  readonly action?: "start" | "prepare" | "stop" | "verify" | "access";
  readonly on_stop?: Text;
  readonly auto_stop_in?: Text;
  readonly kubernetes?: EnvironmentKubernetes;
  readonly deployment_tier?: Text;
}

/** A deployment environment, as its name or as the map GitLab also accepts. */
export type Environment = Text | EnvironmentOptions;

/** The closed set GitLab documents for `release:assets:links:link_type`. */
export type ReleaseLinkType = "runbook" | "package" | "image" | "other";

/** One asset link on a release; `name` and `url` are the only required keys. */
export interface ReleaseLink {
  readonly name: Text;
  readonly url: Text;
  readonly filepath?: Text;
  readonly link_type?: ReleaseLinkType;
}

/** The files a release links to; GitLab requires the `links` list, not just the wrapper. */
export interface ReleaseAssets {
  readonly links: readonly ReleaseLink[];
}

/** The metadata a job hands to GitLab's release API. */
export interface Release {
  readonly tag_name: Text;
  /** The message for the annotated tag, when the release creates one. */
  readonly tag_message?: Text;
  readonly description: Text;
  readonly name?: Text;
  readonly ref?: Text;
  readonly milestones?: readonly Text[];
  readonly released_at?: Text;
  readonly assets?: ReleaseAssets;
}
