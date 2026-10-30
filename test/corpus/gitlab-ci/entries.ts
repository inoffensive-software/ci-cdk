import type { Pipeline } from "@inoffensive/ci-cdk/gitlab-ci";
import { GITLAB_PAGES } from "./gitlab-pages.fixture.js";
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
  { name: "gitlab-pages", file: "gitlab-pages.yml", pipeline: GITLAB_PAGES },
];
