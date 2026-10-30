import { type Pipeline, job, pipeline } from "../../../src/gitlab-ci/index.js";

/**
 * The definition `terraform-images.yml` must reproduce. It lives beside the test so the
 * coverage-debt ledger can import it and walk every fixture in one place.
 *
 * Entries are compared semantically, so a fixture may write a scalar or a collection however the DSL
 * prefers. Where the vocabulary models a key, a fixture uses that field rather than `raw`.
 */
export const TERRAFORM_IMAGES: Pipeline = pipeline({
  stages: ["test", "build", "deploy"],
  templates: {
    ".terraform-versions": {
      parallel: {
        matrix: [
          { TERRAFORM_BINARY_VERSION: "1.5.7", TERRAFORM_VERSION: "1.5" },
          { TERRAFORM_BINARY_VERSION: "1.4.6", TERRAFORM_VERSION: "1.4" },
          { TERRAFORM_BINARY_VERSION: "1.3.9", TERRAFORM_VERSION: "1.3" },
          { TERRAFORM_BINARY_VERSION: "1.2.9", TERRAFORM_VERSION: "1.2" },
          { TERRAFORM_BINARY_VERSION: "1.1.9", TERRAFORM_VERSION: "1.1" },
        ],
      },
    },
  },
  jobs: [
    job({
      name: "shell check",
      stage: "test",
      script: ["shellcheck src/**/*.sh"],
      raw: {
        image: "koalaman/shellcheck-alpine:v0.9.0",
        before_script: ["shellcheck --version"],
      },
    }),
    job({
      name: "dockerfile check",
      stage: "test",
      script: ["hadolint --ignore DL3059 --ignore DL3006 --ignore DL3018 Dockerfile"],
      raw: {
        image: "hadolint/hadolint:latest-alpine",
        before_script: ["hadolint --version"],
      },
    }),
    job({
      name: "build terraform",
      stage: "build",
      script: [
        "docker buildx create --use",
        'docker buildx build --platform "$PLATFORMS" --build-arg BASE_IMAGE=$BASE_IMAGE --build-arg TERRAFORM_BINARY_VERSION=$TERRAFORM_BINARY_VERSION --file Dockerfile --tag "$TERRAFORM_IMAGE_NAME" --provenance=false --push .',
      ],
      raw: {
        extends: ".terraform-versions",
        services: ["$DOCKER_DIND_IMAGE"],
        image: "$DOCKER_DIND_IMAGE",
        before_script: [
          "docker run --rm --privileged tonistiigi/binfmt",
          'docker login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"',
        ],
      },
    }),
    job({
      name: "release-terraform",
      stage: "deploy",
      script: [
        'crane auth login -u "$CI_REGISTRY_USER" -p "$CI_REGISTRY_PASSWORD" "$CI_REGISTRY"',
        'crane copy "$TERRAFORM_IMAGE_NAME" "$RELEASE_IMAGE_NAME:latest"',
        'crane copy "$TERRAFORM_IMAGE_NAME" "$CI_REGISTRY_IMAGE/releases/terraform:$TERRAFORM_BINARY_VERSION"',
        'crane copy "$TERRAFORM_IMAGE_NAME" "$RELEASE_IMAGE_NAME:$CI_COMMIT_TAG"',
        'if [ "$TERRAFORM_VERSION" = "$STABLE_VERSION" ]; then crane copy "$TERRAFORM_IMAGE_NAME" "$STABLE_IMAGE_NAME"; fi',
      ],
      raw: {
        extends: ".terraform-versions",
        variables: {
          RELEASE_IMAGE_NAME: "$CI_REGISTRY_IMAGE/releases/$TERRAFORM_VERSION",
        },
        image: {
          name: "gcr.io/go-containerregistry/crane:debug",
          entrypoint: [""],
        },
        rules: [{ if: "$CI_COMMIT_TAG" }],
      },
    }),
    job({
      name: "release",
      stage: "deploy",
      script: 'echo "Creating release $CI_COMMIT_TAG"',
      raw: {
        needs: ["release-terraform"],
        image: "registry.gitlab.com/gitlab-org/release-cli:latest",
        rules: [{ if: "$CI_COMMIT_TAG" }],
        release: {
          tag_name: "$CI_COMMIT_TAG",
          description: "terraform-images release $CI_COMMIT_TAG",
        },
      },
    }),
  ],
  raw: {
    workflow: {
      rules: [
        { if: '$CI_PROJECT_PATH == "gitlab-org/terraform-images"', when: "never" },
        { if: "$CI_MERGE_REQUEST_IID" },
        { if: "$CI_COMMIT_TAG" },
        { if: "$CI_COMMIT_BRANCH && $CI_COMMIT_REF_PROTECTED == 'true'" },
      ],
    },
    variables: {
      BASE_IMAGE: "alpine:3.18.4",
      TERRAFORM_IMAGE_NAME:
        "$CI_REGISTRY_IMAGE/branches/$CI_COMMIT_REF_SLUG-$TERRAFORM_VERSION:$CI_COMMIT_SHA",
      DOCKER_DIND_IMAGE: "docker:24.0.7-dind",
      PLATFORMS: "linux/amd64,linux/arm64",
      STABLE_IMAGE_NAME: "$CI_REGISTRY_IMAGE/stable:latest",
      STABLE_VERSION: "1.5",
    },
  },
});
