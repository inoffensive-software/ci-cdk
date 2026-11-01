import { describe, expect, it } from "vitest";

import { render } from "./index.js";
import { stepOf, withStep } from "./runtime-test-support.js";

describe("self-hosted runtime sizing", () => {
  it("emits cpu, memory, storage and volumes in order", () => {
    const config = withStep({
      runtime: {
        "self-hosted": {
          cpu: 4,
          memory: 8192,
          storage: {
            aws: {
              "oidc-role": "arn:aws:iam::123:role/runner",
              bucket: "runner-cache",
              region: "ap-southeast-2",
            },
          },
          volumes: ["/var/run/docker.sock:/var/run/docker.sock", "/tmp:/tmp"],
        },
      },
      script: ["true"],
    });

    expect(stepOf(config).runtime).toStrictEqual({
      "self-hosted": {
        cpu: 4,
        memory: 8192,
        storage: {
          aws: {
            "oidc-role": "arn:aws:iam::123:role/runner",
            bucket: "runner-cache",
            region: "ap-southeast-2",
          },
        },
        volumes: ["/var/run/docker.sock:/var/run/docker.sock", "/tmp:/tmp"],
      },
    });
    expect(Object.keys(stepOf(config).runtime?.["self-hosted"] ?? {})).toStrictEqual([
      "cpu",
      "memory",
      "storage",
      "volumes",
    ]);
  });

  it("emits only the sizing keys the author set", () => {
    expect(
      stepOf(withStep({ runtime: { "self-hosted": { cpu: 1 } }, script: ["true"] })).runtime,
    ).toStrictEqual({ "self-hosted": { cpu: 1 } });
  });
});

describe("self-hosted storage", () => {
  it("emits the AWS key pair arm alphabetically", () => {
    const config = withStep({
      runtime: {
        "self-hosted": {
          storage: {
            aws: {
              "access-key": "${AWS_ACCESS_KEY_ID}",
              bucket: "runner-cache",
              region: "us-east-1",
              "secret-key": "${AWS_SECRET_ACCESS_KEY}",
            },
          },
        },
      },
      script: ["true"],
    });

    expect(render(config, { header: "" })).toContain(
      [
        "        runtime:",
        "          self-hosted:",
        "            storage:",
        "              aws:",
        "                access-key: ${AWS_ACCESS_KEY_ID}",
        "                bucket: runner-cache",
        "                region: us-east-1",
        "                secret-key: ${AWS_SECRET_ACCESS_KEY}",
      ].join("\n"),
    );
  });

  it("emits the GCP storage arm", () => {
    const config = withStep({
      runtime: {
        "self-hosted": {
          storage: { gcp: { bucket: "runner-cache", "key-file": "${GCP_KEY_FILE}" } },
        },
      },
      script: ["true"],
    });

    expect(stepOf(config).runtime).toStrictEqual({
      "self-hosted": {
        storage: { gcp: { bucket: "runner-cache", "key-file": "${GCP_KEY_FILE}" } },
      },
    });
  });
});
