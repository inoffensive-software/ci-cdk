import type { Pipeline } from "../../../src/gitlab-ci/index.js";
import { TERRAFORM_IMAGES } from "./terraform-images.fixture.js";

/** One corpus entry: the definition, the vendored file it reproduces, and the name a failure uses. */
export interface CorpusEntry {
  readonly name: string;
  readonly file: string;
  readonly pipeline: Pipeline;
}

export const GITLAB_ENTRIES: readonly CorpusEntry[] = [
  { name: "terraform-images", file: "terraform-images.yml", pipeline: TERRAFORM_IMAGES },
];
