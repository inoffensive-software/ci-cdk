import { describe, expect, it } from "vitest";

import { schemaFromText, walkSchema, type SchemaNode } from "./walk.js";

/**
 * One synthetic schema holding every shape the walk understands, so each test reasons about a single
 * shape without a 20 kB vendored file in the way. The real schema is data and changes; this is not.
 */
const SCHEMA: SchemaNode = {
  type: "object",
  properties: {
    name: { type: "string" },
    labelled: { $ref: "#/definitions/labelled" },
    trigger: {
      oneOf: [
        { properties: { events: { type: "string" } } },
        { anyOf: [{ properties: { inputs: { type: "object" } } }] },
      ],
    },
    steps: { items: { properties: { run: { type: "string" } } } },
    services: {
      patternProperties: { "^[a-z]+$": { properties: { image: { type: "string" } } } },
    },
    env: { additionalProperties: true },
    closed: { properties: { fixed: { type: "string" } }, additionalProperties: false },
    labels: { additionalProperties: { properties: { owner: { type: "string" } } } },
    tree: { $ref: "#/definitions/node" },
    augmented: {
      $ref: "#/definitions/labelled",
      oneOf: [{ properties: { extra: { type: "string" } } }],
    },
    stream: { $ref: "#/definitions/labelled", type: "array", items: { type: "string" } },
  },
  definitions: {
    labelled: { properties: { label: { type: "string" } } },
    node: { properties: { child: { $ref: "#/definitions/node" } } },
    orphan: { properties: { ghost: { type: "string" } } },
  },
};

const EXPECTED: readonly string[] = [
  "$.augmented",
  "$.augmented.extra",
  "$.augmented.label",
  "$.closed",
  "$.closed.fixed",
  "$.env",
  "$.env.*",
  "$.labels",
  "$.labels.*",
  "$.labels.*.owner",
  "$.labelled",
  "$.labelled.label",
  "$.name",
  "$.services",
  "$.services.*",
  "$.services.*.image",
  "$.steps",
  "$.steps[]",
  "$.steps[].run",
  "$.stream",
  "$.stream[]",
  "$.stream.label",
  "$.tree",
  "$.tree.child",
  "$.tree.child.child",
  "$.trigger",
  "$.trigger.events",
  "$.trigger.inputs",
];

/** A map whose keys an author chooses, so the walker can be asked to normalise its children. */
const AUTHOR_NAMED_MAP: SchemaNode = {
  properties: {
    jobs: { properties: { build: { properties: { runs: { type: "number" } } } } },
  },
};

const TUPLE_ITEMS: SchemaNode = {
  properties: { pair: { items: [{ type: "string" }, { type: "number" }] } },
};

const TUPLE_PREFIX: SchemaNode = {
  properties: { pair: { prefixItems: [{ type: "string" }] } },
};

const MISSING_REFERENCE: SchemaNode = {
  properties: { broken: { $ref: "#/definitions/missing" } },
};

/**
 * A node that contains itself, the shape the vendored schema uses for steps and matrix cells. Its
 * keys sit at the top level and one level down; a walker that stops at the repeat loses the second.
 */
const RECURSIVE: SchemaNode = {
  properties: { tree: { $ref: "#/definitions/node" } },
  definitions: {
    node: {
      properties: {
        name: { type: "string" },
        children: { items: { $ref: "#/definitions/node" } },
      },
    },
  },
};

describe("walkSchema", () => {
  it("walks every shape from the root into one sorted set", () => {
    const paths = walkSchema(SCHEMA, []);

    expect(paths).toEqual(EXPECTED.toSorted());
    expect(paths).toEqual([...paths].toSorted());
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("resolves a reference against the schema's definitions", () => {
    expect(walkSchema(SCHEMA, [])).toContain("$.labelled.label");
  });

  it("starts at the root, so a definition nothing references contributes nothing", () => {
    expect(walkSchema(SCHEMA, [])).not.toContain("$.ghost");
  });

  it("terminates on a reference cycle after repeating the target's paths one level down", () => {
    expect(walkSchema(SCHEMA, []).filter((path) => path.startsWith("$.tree"))).toEqual([
      "$.tree",
      "$.tree.child",
      "$.tree.child.child",
    ]);
  });

  it("repeats a recursive definition's keys at the top level and one level down", () => {
    const paths = walkSchema(RECURSIVE, []).filter((path) => path.startsWith("$.tree"));

    expect(paths).toEqual([
      "$.tree",
      "$.tree.children",
      "$.tree.children[]",
      "$.tree.children[].children",
      "$.tree.children[].children[]",
      "$.tree.children[].name",
      "$.tree.name",
    ]);
  });
});

describe("walkSchema references", () => {
  it("unions a reference with the keywords beside it", () => {
    const paths = walkSchema(SCHEMA, []);

    expect(paths).toEqual(expect.arrayContaining(["$.augmented.label", "$.augmented.extra"]));
  });

  it("reads an items beside a reference as the element position", () => {
    expect(walkSchema(SCHEMA, [])).toContain("$.stream[]");
  });
});

describe("walkSchema unions and sequences", () => {
  it("unions every branch of oneOf and anyOf", () => {
    const paths = walkSchema(SCHEMA, []);

    expect(paths).toContain("$.trigger.events");
    expect(paths).toContain("$.trigger.inputs");
  });

  it("normalises an array to one sequence position", () => {
    const paths = walkSchema(SCHEMA, []);

    expect(paths).toContain("$.steps[]");
    expect(paths).toContain("$.steps[].run");
    expect(paths.some((path) => /\d/u.test(path))).toBe(false);
  });
});

describe("walkSchema maps", () => {
  it("turns a pattern-keyed map into one wildcard child", () => {
    expect(walkSchema(SCHEMA, [])).toEqual(
      expect.arrayContaining(["$.services.*", "$.services.*.image"]),
    );
  });

  it("marks an open map's children as wildcards", () => {
    const paths = walkSchema(SCHEMA, []);

    expect(paths).toContain("$.env.*");
    expect(paths.filter((path) => path.startsWith("$.env"))).toEqual(["$.env", "$.env.*"]);
  });

  it("walks a schema-valued additionalProperties at a wildcard child", () => {
    expect(walkSchema(SCHEMA, [])).toContain("$.labels.*.owner");
  });

  it("leaves a closed map without a wildcard child", () => {
    const paths = walkSchema(SCHEMA, []);

    expect(paths).toContain("$.closed.fixed");
    expect(paths).not.toContain("$.closed.*");
  });

  it("normalises children of an author-named map to a wildcard when the caller says so", () => {
    expect(walkSchema(AUTHOR_NAMED_MAP, [])).toEqual([
      "$.jobs",
      "$.jobs.build",
      "$.jobs.build.runs",
    ]);

    expect(walkSchema(AUTHOR_NAMED_MAP, ["$.jobs"])).toEqual([
      "$.jobs",
      "$.jobs.*",
      "$.jobs.*.runs",
    ]);
  });
});

describe("walkSchema refusals", () => {
  it("throws on items given as an array, naming the path", () => {
    expect(() => walkSchema(TUPLE_ITEMS, [])).toThrow(/\$\.pair/u);
  });

  it("throws on prefixItems, naming the path", () => {
    expect(() => walkSchema(TUPLE_PREFIX, [])).toThrow(/\$\.pair/u);
  });

  it("throws on a reference that does not resolve, naming the reference", () => {
    expect(() => walkSchema(MISSING_REFERENCE, [])).toThrow(/#\/definitions\/missing/u);
  });
});

describe("schemaFromText", () => {
  it("parses schema text into the data the walker reads", () => {
    expect(schemaFromText(JSON.stringify(AUTHOR_NAMED_MAP))).toEqual(AUTHOR_NAMED_MAP);
  });
});
