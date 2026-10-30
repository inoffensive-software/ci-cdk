import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import {
  type EventName,
  type On,
  type Triggers,
  type Workflow,
  job,
  render,
  step,
  workflow,
} from "./index.js";

const withOn = (on: On): Workflow =>
  workflow({
    name: "CI",
    on,
    jobs: [job({ id: "build", "runs-on": "ubuntu-latest", steps: [step({ run: "npm test" })] })],
  });

const renderOn = (on: On): string => render(withOn(on), { header: "" });

describe("trigger shapes", () => {
  it("accepts one event name", () => {
    expect(renderOn("push")).toContain("on: push\n");
  });

  it("accepts several event names", () => {
    expect(renderOn(["push", "pull_request"])).toContain("on:\n  - push\n  - pull_request\n");
  });

  it("accepts workflow_call as a bare event name", () => {
    expect(renderOn("workflow_call")).toContain("on: workflow_call\n");
  });

  it("emits an event with no options as a null, the way a bare event is written", () => {
    expect(renderOn({ workflow_call: {} })).toContain("on:\n  workflow_call: null\n");
  });
});

describe("bare event golden", () => {
  it("pins events with no options beside a configured one", async () => {
    await expect(renderOn({ push: {}, pull_request: {}, workflow_call: {} })).toMatchFileSnapshot(
      "__snapshots__/bare-events.yml",
    );
  });
});

describe("trigger options", () => {
  it("pins a branch filter, a cron entry and a dispatch input", async () => {
    const workflowWithTriggers = withOn({
      push: { branches: ["main"], paths: ["src/**"] },
      schedule: [{ cron: "0 3 * * *" }],
      workflow_dispatch: {
        inputs: {
          dry_run: {
            type: "boolean",
            description: "Skip the deploy",
            required: false,
            default: false,
          },
          target: {
            type: "choice",
            description: "Where to deploy",
            options: ["staging", "production"],
            default: "staging",
          },
        },
      },
    });

    await expect(render(workflowWithTriggers)).toMatchFileSnapshot("__snapshots__/triggers.yml");
  });

  it("follows author order for events and their options", () => {
    const text = renderOn({
      push: { paths: ["src/**"], branches: ["main"] },
      schedule: [{ cron: "0 3 * * *" }],
    });

    expect(text.indexOf("push:")).toBeLessThan(text.indexOf("schedule:"));
    expect(text.indexOf("paths:")).toBeLessThan(text.indexOf("branches:"));
  });

  it("keeps typed dispatch input defaults", () => {
    const text = renderOn({
      workflow_dispatch: {
        inputs: {
          dry_run: { type: "boolean", default: false },
          environment: { type: "environment", required: true },
        },
      },
    });

    expect(text).toContain("        default: false\n");
    expect(text).toContain("        required: true\n");
  });
});

describe("activity types", () => {
  it("emits the types sequence an event documents", () => {
    const text = renderOn({ release: { types: ["published", "released"] } });

    expect(text).toContain("on:\n  release:\n    types:\n      - published\n      - released\n");
  });

  it("still lowers a types-bearing event with no options to null", () => {
    expect(renderOn({ release: {} })).toContain("on:\n  release: null\n");
  });

  it("rejects a filter an event does not document", () => {
    // @ts-expect-error "release" takes only activity types, never branch filters
    const filtered: Triggers = { release: { branches: ["main"] } };

    expect(filtered).toStrictEqual({ release: { branches: ["main"] } });
  });
});

describe("event filters", () => {
  it("accepts every filter GitHub documents", () => {
    const included = renderOn({
      push: { branches: ["main"], paths: ["src/**"], tags: ["v1.*"], types: ["opened"] },
    });

    const ignored = renderOn({
      push: {
        "branches-ignore": ["gh-pages"],
        "paths-ignore": ["docs/**"],
        "tags-ignore": ["v0.*"],
      },
    });

    expect(included).toContain("- main");
    expect(included).toContain("- src/**");
    expect(included).toContain("- v1.*");
    expect(included).toContain("- opened");
    expect(ignored).toContain("- gh-pages");
    expect(ignored).toContain("- docs/**");
    expect(ignored).toContain("- v0.*");
  });

  it("accepts image_version name and version filters", () => {
    const text = renderOn({ image_version: { names: ["MyNewImage"], versions: ["1.*", "2.*"] } });

    expect(text).toContain("  image_version:\n");
    expect(text).toContain("    names:\n");
    expect(text).toContain("      - MyNewImage\n");
    expect(text).toContain("    versions:\n");
    expect(text).toContain("      - 1.*\n");
  });

  it("accepts the same filters on pull_request", () => {
    const text = renderOn({ pull_request: { branches: ["main"], types: ["opened"] } });

    expect(text).toContain("pull_request:");
  });
});

describe("closed event names", () => {
  it("rejects an unknown event name at typecheck", () => {
    // @ts-expect-error "puhs" is not a documented GitHub event
    const event: EventName = "puhs";

    expect(event).toBe("puhs");
  });

  it("rejects an unknown trigger key at typecheck", () => {
    // @ts-expect-error an unknown key is not a documented event
    const triggers: Triggers = { pushy: {} };

    expect(triggers).toStrictEqual({ pushy: {} });
  });

  it("rejects an unknown event name through the builder", () => {
    // @ts-expect-error "puhs" is not a documented GitHub event
    const invalid = workflow({ name: "CI", on: "puhs", jobs: [] });

    expect(invalid.on).toBe("puhs");
  });
});

describe("schedule timezone and number inputs", () => {
  it("emits a schedule timezone directly after its cron", () => {
    const text = renderOn({ schedule: [{ cron: "23 3 * * *", timezone: "Europe/Paris" }] });

    expect(text).toContain("  schedule:\n    - cron: 23 3 * * *\n      timezone: Europe/Paris\n");
  });

  it("emits a number dispatch input with its default as a number", () => {
    const text = renderOn({
      workflow_dispatch: {
        inputs: {
          issue: { type: "number", description: "An issue number", required: false, default: 42 },
        },
      },
    });

    expect(text).toContain("        type: number\n");
    expect(parse(text)).toStrictEqual({
      name: "CI",
      on: {
        workflow_dispatch: {
          inputs: {
            issue: { type: "number", description: "An issue number", required: false, default: 42 },
          },
        },
      },
      jobs: { build: { "runs-on": "ubuntu-latest", steps: [{ run: "npm test" }] } },
    });
  });
});
