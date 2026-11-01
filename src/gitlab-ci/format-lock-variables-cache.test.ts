import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Pipeline, job, pipeline, render } from "./index.js";

/**
 * The variables/cache/needs/rules half of the format lock: the object forms and the nested options
 * this ticket promotes, pinned on bytes so the emitted shape cannot drift.
 */

const bare = (value: Pipeline): string => render(value, { header: "" });

const nesting = (): Pipeline =>
  pipeline({
    variables: {
      STABLE_VERSION: "1.5",
      TARGET: {
        value: "staging",
        expand: false,
        options: ["staging", "production"],
        description: "the environment to release",
      },
    },
    jobs: [
      job({
        name: "deploy",
        stage: "deploy",
        needs: [
          "build",
          { job: "test", artifacts: true },
          { job: "upstream", project: "group/upstream", ref: "main" },
          { job: "previous", pipeline: "1234", optional: true },
        ],
        rules: [
          {
            if: "$CI_COMMIT_BRANCH",
            exists: { paths: ["Dockerfile"], project: "group/shared", ref: "main" },
            variables: { DEPLOY: "true", SHARDS: 4 },
          },
          { exists: { regexp: "^ci/.*\\.yml$" } },
          { exists: ["Dockerfile"] },
        ],
        services: [{ name: "redis:7", variables: { REDIS_DB: { value: "1", expand: false } } }],
        variables: { DEPLOY_ENV: { value: "production", expand: true } },
        cache: [
          {
            key: { files: ["go.sum"], files_commits: ["go.sum"], prefix: "go-" },
            paths: [".cache/go"],
            policy: "pull",
            unprotect: true,
            when: "on_success",
            fallback_keys: ["go-main"],
          },
        ],
        script: "make deploy",
      }),
    ],
  });

describe("variables, cache, needs and rules golden", () => {
  it("pins the nesting on bytes", async () => {
    await expect(bare(nesting())).toMatchFileSnapshot("__snapshots__/format-variables-cache.yml");
  });

  it("parses back to the author's shape", () => {
    const parsed = parse(bare(nesting()));

    expect(parsed.variables.TARGET).toStrictEqual({
      value: "staging",
      expand: false,
      options: ["staging", "production"],
      description: "the environment to release",
    });
    expect(parsed.deploy.needs).toStrictEqual([
      "build",
      { job: "test", artifacts: true },
      { job: "upstream", project: "group/upstream", ref: "main" },
      { job: "previous", pipeline: "1234", optional: true },
    ]);
    expect(parsed.deploy.rules[0].exists).toStrictEqual({
      paths: ["Dockerfile"],
      project: "group/shared",
      ref: "main",
    });
    expect(parsed.deploy.cache[0].key).toStrictEqual({
      files: ["go.sum"],
      files_commits: ["go.sum"],
      prefix: "go-",
    });
    expect(parsed.deploy.cache[0].unprotect).toBe(true);
  });
});
