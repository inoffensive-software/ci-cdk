import type { Pipeline } from "@inoffensive/ci-cdk/gitlab-ci";
import { LABKIT } from "./labkit.fixture.js";
import { TERRAFORM_IMAGES } from "./terraform-images.fixture.js";

export interface CorpusEntry {
  readonly name: string;
  readonly file: string;
  readonly pipeline: Pipeline;
}

export const GITLAB_ENTRIES: readonly CorpusEntry[] = [
  { name: "terraform-images", file: "terraform-images.yml", pipeline: TERRAFORM_IMAGES },
  { name: "labkit", file: "labkit.yml", pipeline: LABKIT },
];
