import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DiagnosticError, type Diagnostic, type Doc, type DocEntry } from "../core/index.js";
import {
  type CustomVariable,
  type PipelineConfig,
  pipelineConfig,
  render,
  step,
  toDoc,
} from "./index.js";

interface ParsedVariable {
  readonly name?: string;
  readonly default?: string;
  readonly description?: string;
  readonly "allowed-values"?: readonly string[];
}

interface ParsedDocument {
  readonly pipelines: {
    readonly custom: Readonly<
      Record<string, readonly { readonly variables?: readonly ParsedVariable[] }[]>
    >;
  };
}

const withVariables = (variables: readonly CustomVariable[]): PipelineConfig =>
  pipelineConfig({
    pipelines: {
      custom: [
        {
          name: "release",
          variables,
          pipeline: [step({ script: ["npm test"] })],
        },
      ],
    },
  });

const parsed = (config: PipelineConfig): ParsedDocument => parse(render(config, { header: "" }));

/**
 * The pinned schema's `CustomVariable` shape. `description` is typed there, but no vendored config
 * carries it, so this synthetic fixture is the evidence for that key.
 */
const SCHEMA_DERIVED_VARIABLES: readonly CustomVariable[] = [
  {
    name: "TARGET",
    description: "Where to deploy",
    default: "staging",
    "allowed-values": ["staging", "production"],
  },
];

const diagnosticsOf = (config: PipelineConfig): readonly Diagnostic[] => {
  try {
    render(config);
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics;
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

const entries = (doc: Doc): readonly DocEntry[] => {
  if (doc.kind !== "map") {
    throw new Error("expected a map");
  }

  return doc.entries;
};

const customItems = (doc: Doc): readonly Doc[] => {
  const pipelines = entries(doc).find((entry) => entry.key === "pipelines");

  if (pipelines === undefined) {
    throw new Error("no pipelines");
  }

  const custom = entries(pipelines.value).find((entry) => entry.key === "custom");

  if (custom === undefined) {
    throw new Error("no custom");
  }

  const release = entries(custom.value)[0];

  if (release === undefined || release.value.kind !== "seq") {
    throw new Error("no custom pipeline");
  }

  return release.value.items;
};

const keyOf = (doc: Doc): string => {
  const [first] = entries(doc);

  if (first === undefined) {
    throw new Error("expected one key");
  }

  return first.key;
};

describe("custom-pipeline variables", () => {
  it("emits one leading variables item before the pipeline's items", () => {
    const text = render(
      withVariables([{ name: "TARGET", default: "staging", description: "Where to deploy" }]),
      { header: "" },
    );

    expect(text).toBe(
      [
        "pipelines:",
        "  custom:",
        "    release:",
        "      - variables:",
        "          - default: staging",
        "            description: Where to deploy",
        "            name: TARGET",
        "      - step:",
        "          script:",
        "            - npm test",
        "",
      ].join("\n"),
    );
  });

  it("emits allowed-values, default, description and name in that order", () => {
    const text = render(
      withVariables([
        {
          name: "TIER",
          description: "Target tier",
          default: "small",
          "allowed-values": ["small", "large"],
        },
      ]),
      { header: "" },
    );

    expect(text).toContain(
      [
        "          - allowed-values:",
        "              - small",
        "              - large",
        "            default: small",
        "            description: Target tier",
        "            name: TIER",
      ].join("\n"),
    );
  });
});

describe("custom-pipeline variable data", () => {
  it("parses back to the data it was built from", () => {
    expect(
      parsed(
        withVariables([
          { name: "TIER", "allowed-values": ["small", "large"], default: "small" },
          { name: "TOKEN" },
        ]),
      ).pipelines["custom"]["release"]?.[0]?.variables,
    ).toStrictEqual([
      { name: "TIER", "allowed-values": ["small", "large"], default: "small" },
      { name: "TOKEN" },
    ]);
  });

  it("omits every absent key", () => {
    expect(
      parsed(withVariables([{ name: "TOKEN" }])).pipelines["custom"]["release"]?.[0]?.variables,
    ).toStrictEqual([{ name: "TOKEN" }]);
  });

  it("round-trips the schema's description key from a synthetic fixture", () => {
    expect(
      parsed(withVariables(SCHEMA_DERIVED_VARIABLES)).pipelines["custom"]["release"]?.[0]
        ?.variables,
    ).toStrictEqual(SCHEMA_DERIVED_VARIABLES);
  });

  it("keeps a custom pipeline without variables exactly as before", () => {
    const text = render(
      pipelineConfig({
        pipelines: { custom: [{ name: "release", pipeline: [step({ script: ["npm test"] })] }] },
      }),
      { header: "" },
    );

    expect(text).toBe(
      [
        "pipelines:",
        "  custom:",
        "    release:",
        "      - step:",
        "          script:",
        "            - npm test",
        "",
      ].join("\n"),
    );
  });
});

describe("custom-variable lowering", () => {
  it("lowers the variables item as the sole key of the first item", () => {
    const items = customItems(toDoc(withVariables([{ name: "TOKEN" }])));

    expect(items.map(keyOf)).toStrictEqual(["variables", "step"]);
    expect(items[0] === undefined ? [] : entries(items[0]).length).toBe(1);
  });

  it("keeps each variable's keys in schema order", () => {
    const items = customItems(
      toDoc(
        withVariables([
          {
            name: "TIER",
            description: "Target tier",
            default: "small",
            "allowed-values": ["small", "large"],
          },
        ]),
      ),
    );

    const variables = items[0] === undefined ? undefined : entries(items[0])[0]?.value;

    if (variables === undefined || variables.kind !== "seq") {
      throw new Error("no variables sequence");
    }

    const [variable] = variables.items;

    expect(variable === undefined ? [] : entries(variable).map((entry) => entry.key)).toStrictEqual(
      ["allowed-values", "default", "description", "name"],
    );
  });
});

describe("custom-variable validation", () => {
  it("refuses an empty name at the variable's name", () => {
    expect(
      diagnosticsOf(withVariables([{ name: "", default: "x" }])).map(({ path, message }) => ({
        path,
        message,
      })),
    ).toStrictEqual([
      {
        path: "$.pipelines.custom[0].variables[0].name",
        message: "a custom variable needs a non-empty name",
      },
    ]);
  });

  it("refuses an allowed-values list with no values at the variable's allowed-values", () => {
    expect(
      diagnosticsOf(withVariables([{ name: "TIER", "allowed-values": [] }])).map(
        ({ path, message }) => ({ path, message }),
      ),
    ).toStrictEqual([
      {
        path: '$.pipelines.custom[0].variables[0]["allowed-values"]',
        message: "a custom variable needs at least one allowed value",
      },
    ]);
  });
});
