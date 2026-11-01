import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Value } from "../core/index.js";
import { type Job, type Pipeline, job, pipeline, render, toDoc } from "./index.js";

const bare = (value: Pipeline): string => render(value, { header: "" });

/** One job, so each field reads as the body it produces rather than as a whole document. */
const body = (fields: Omit<Job, "name">): Readonly<Record<string, Value>> =>
  parse(bare(pipeline({ jobs: [job({ name: "deploy", ...fields })] }))).deploy;

const keysOf = (value: Value | undefined): readonly string[] =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? Object.keys(value) : [];

const diagnosticsOf = (run: () => void): readonly string[] => {
  try {
    run();
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics.map(({ path }) => path);
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

describe("job id_tokens", () => {
  it("writes one audience as a string and several as a list, as documented", () => {
    const idTokens = {
      VAULT_ID_TOKEN: { aud: "https://vault.example.com" },
      CLOUD_ID_TOKEN: { aud: ["https://gcp.example.com", "https://aws.example.com"] },
    } satisfies NonNullable<Job["id_tokens"]>;

    expect(body({ script: "./deploy.sh", id_tokens: idTokens })["id_tokens"]).toStrictEqual(
      idTokens,
    );
  });

  it("keeps the author's token order and names", () => {
    const parsed = body({
      id_tokens: {
        SECOND: { aud: "https://second.example.com" },
        FIRST: { aud: "https://first.example.com" },
      },
    });

    expect(keysOf(parsed["id_tokens"])).toStrictEqual(["SECOND", "FIRST"]);
  });

  it("emits no id_tokens key when the field is absent", () => {
    expect(Object.keys(body({ script: "true" }))).toStrictEqual(["script"]);
  });
});

describe("job identity", () => {
  it("writes the documented provider identifier", () => {
    expect(body({ script: "true", identity: "google_cloud" })["identity"]).toBe("google_cloud");
  });

  it("emits no identity key when the field is absent", () => {
    expect(Object.keys(body({ script: "true" }))).toStrictEqual(["script"]);
  });
});

describe("job token position", () => {
  it("writes id_tokens and identity after secrets and before cache", () => {
    const parsed = parse(
      bare(
        pipeline({
          jobs: [
            job({
              name: "deploy",
              stage: "deploy",
              script: "true",
              secrets: { TOKEN: { vault: "secret" } },
              id_tokens: { ID_TOKEN: { aud: "https://vault.example.com" } },
              identity: "google_cloud",
              variables: { A: "b" },
              cache: { paths: [".cache"] },
            }),
          ],
        }),
      ),
    );

    expect(Object.keys(parsed.deploy)).toStrictEqual([
      "stage",
      "variables",
      "secrets",
      "id_tokens",
      "identity",
      "cache",
      "script",
    ]);
  });
});

describe("default id_tokens and identity", () => {
  it("writes both keys in the fixed default order", () => {
    const parsed = parse(
      bare(
        pipeline({
          default: {
            hooks: { pre_get_sources_script: ["git submodule update --init"] },
            id_tokens: { DEFAULT_ID_TOKEN: { aud: "https://vault.example.com" } },
            identity: "google_cloud",
            cache: { paths: [".cache"] },
          },
          jobs: [job({ name: "deploy", script: "true" })],
        }),
      ),
    );

    expect(Object.keys(parsed.default)).toStrictEqual(["hooks", "id_tokens", "identity", "cache"]);
    expect(parsed.default["id_tokens"]).toStrictEqual({
      DEFAULT_ID_TOKEN: { aud: "https://vault.example.com" },
    });
    expect(parsed.default["identity"]).toBe("google_cloud");
  });

  it("emits no default key when either field is absent", () => {
    const parsed = parse(
      bare(
        pipeline({
          default: { id_tokens: { DEFAULT_ID_TOKEN: { aud: "https://vault.example.com" } } },
          jobs: [job({ name: "deploy", script: "true" })],
        }),
      ),
    );

    expect(Object.keys(parsed.default)).toStrictEqual(["id_tokens"]);
  });
});

/** A pipeline with one modelled job, so a raw collision reads as the entry the author wrote. */
const withRawJob = (raw: Readonly<Record<string, Value>>): Pipeline =>
  pipeline({ jobs: [job({ name: "deploy", script: "true", raw })] });

describe("raw tokens", () => {
  it("refuses a job raw id_tokens or identity, even when the job declares neither", () => {
    const refused = withRawJob({
      id_tokens: { ID_TOKEN: { aud: "https://vault.example.com" } },
      identity: "google_cloud",
    });

    expect(diagnosticsOf(() => toDoc(refused))).toStrictEqual([
      '$.jobs[0].raw["id_tokens"]',
      '$.jobs[0].raw["identity"]',
    ]);
  });

  it("refuses a pipeline raw default, so default id_tokens or identity cannot bypass the field", () => {
    const refused = pipeline({
      default: { id_tokens: { DEFAULT_ID_TOKEN: { aud: "https://vault.example.com" } } },
      jobs: [job({ name: "deploy", script: "true" })],
      raw: {
        default: {
          id_tokens: { DEFAULT_ID_TOKEN: { aud: "https://vault.example.com" } },
          identity: "google_cloud",
        },
      },
    });

    expect(diagnosticsOf(() => toDoc(refused))).toStrictEqual(['$.raw["default"]']);
  });

  it("keeps the typed keys first when the job also carries raw", () => {
    const text = bare(
      pipeline({
        jobs: [
          job({
            name: "deploy",
            script: "true",
            id_tokens: { ID_TOKEN: { aud: "https://vault.example.com" } },
            raw: { pages: { publish: "public" } },
          }),
        ],
      }),
    );

    expect(Object.keys(parse(text).deploy)).toStrictEqual(["id_tokens", "script", "pages"]);
  });
});
