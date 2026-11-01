import { describe, expect, it } from "vitest";

import { parsed, stepOf, withStep } from "./runtime-test-support.js";
import { render } from "./index.js";

describe("cloud runtime", () => {
  it("emits every key alphabetically between runs-on and script", () => {
    const config = withStep({
      "runs-on": ["linux"],
      runtime: {
        cloud: {
          arch: "arm",
          "atlassian-ip-ranges": true,
          "instance-type": "m6g.large",
          platform: "windows",
          version: "3.10.1",
        },
      },
      script: ["true"],
    });

    expect(render(config, { header: "" })).toContain(
      [
        "        runs-on:",
        "          - linux",
        "        runtime:",
        "          cloud:",
        "            arch: arm",
        "            atlassian-ip-ranges: true",
        "            instance-type: m6g.large",
        "            platform: windows",
        "            version: 3.10.1",
        "        script:",
        '          - "true"',
      ].join("\n"),
    );
    expect(Object.keys(stepOf(config))).toStrictEqual(["runs-on", "runtime", "script"]);
  });

  it("keeps a string version a string", () => {
    const config = withStep({ runtime: { cloud: { version: "3.10" } }, script: ["true"] });

    expect(stepOf(config).runtime).toStrictEqual({ cloud: { version: "3.10" } });
  });

  it("emits only the keys the author set", () => {
    expect(stepOf(withStep({ runtime: { cloud: {} }, script: ["true"] })).runtime).toStrictEqual({
      cloud: {},
    });
  });
});

describe("runtime placement", () => {
  it("does not emit runtime when the author leaves it absent", () => {
    expect(stepOf(withStep({ script: ["true"] }))).toStrictEqual({ script: ["true"] });
  });

  it("emits cloud before self-hosted when both are set", () => {
    const config = withStep({
      runtime: { cloud: { arch: "x86" }, "self-hosted": { cpu: 2 } },
      script: ["true"],
    });

    expect(Object.keys(stepOf(config).runtime ?? {})).toStrictEqual(["cloud", "self-hosted"]);
  });

  it("keeps a step runtime inside the options map", () => {
    const config = withStep({ runtime: { cloud: { arch: "x86" } }, script: ["true"] });

    expect(parsed(config).pipelines.default).toHaveLength(1);
  });
});
