import type { Text } from "../core/index.js";

/**
 * The map form of a job's `pages`: where the published directory is, the URL path prefix, and how
 * long the deployment stays active. Every key is optional in GitLab; an absent one emits nothing.
 */
export interface Pages {
  /** The directory GitLab publishes, relative to the job's working directory. */
  readonly publish?: Text;
  readonly path_prefix?: Text;
  readonly expire_in?: Text;
}

/** A job's `pages`: `true` deploys the job's artifacts, the map relocates the deployment. */
export type JobPages = boolean | Pages;
