import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { type Job, type Pipeline, job, pipeline, render } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

/** The whole job body, untyped at the boundary, for assertions about emitted key order. */
const jobOf = (fields: Omit<Job, "name">) =>
  parse(bare(pipeline({ jobs: [job({ name: "deploy", ...fields })] }))).deploy;

describe("job environment Kubernetes settings", () => {
  const environment = {
    name: "production",
    kubernetes: {
      agent: "path/to/agent/project:agent-name",
      namespace: "production",
      flux_resource_path: "flux-system/gitops-toolkit",
      managed_resources: { enabled: true },
      dashboard: { namespace: "dashboards", flux_resource_path: "flux-system/apps" },
    },
  } as const;

  it("writes every Kubernetes key in the docs' order", () => {
    const parsed = jobOf({ environment });

    expect(parsed.environment).toStrictEqual(environment);
    expect(Object.keys(parsed.environment)).toStrictEqual(["name", "kubernetes"]);
    expect(Object.keys(parsed.environment.kubernetes)).toStrictEqual([
      "agent",
      "namespace",
      "flux_resource_path",
      "managed_resources",
      "dashboard",
    ]);
    expect(Object.keys(parsed.environment.kubernetes.dashboard)).toStrictEqual([
      "namespace",
      "flux_resource_path",
    ]);
  });

  it("writes only the Kubernetes keys the author set", () => {
    const minimal = {
      name: "review",
      kubernetes: { dashboard: { namespace: "review-dashboards" } },
    } as const;

    expect(jobOf({ environment: minimal }).environment).toStrictEqual(minimal);
    expect(jobOf({ environment: { name: "review" } }).environment).toStrictEqual({
      name: "review",
    });
  });

  it("keeps a bare environment name a scalar", () => {
    expect(jobOf({ environment: "production" }).environment).toBe("production");
  });
});

describe("job release tag message and assets", () => {
  const release = {
    tag_name: "$CI_COMMIT_TAG",
    tag_message: "Annotated tag message",
    description: "Release $CI_COMMIT_TAG",
    assets: {
      links: [
        {
          name: "asset1",
          url: "https://example.com/assets/1",
          filepath: "/pretty/url/1",
          link_type: "other",
        },
        { name: "asset2", url: "https://example.com/assets/2" },
      ],
    },
  } as const;

  it("writes the tag message and the asset links in the docs' order", () => {
    const parsed = jobOf({ release });

    expect(parsed.release).toStrictEqual(release);
    expect(Object.keys(parsed.release)).toStrictEqual([
      "tag_name",
      "tag_message",
      "description",
      "assets",
    ]);
    expect(Object.keys(parsed.release.assets.links[0])).toStrictEqual([
      "name",
      "url",
      "filepath",
      "link_type",
    ]);
    expect(Object.keys(parsed.release.assets.links[1])).toStrictEqual(["name", "url"]);
  });

  it("omits the tag message and assets when they are absent", () => {
    expect(jobOf({ release: { tag_name: "v1", description: "one" } }).release).toStrictEqual({
      tag_name: "v1",
      description: "one",
    });
  });
});
