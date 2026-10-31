import { describe, expect, it } from "vitest";
import { isMap, isNode, isScalar, isSeq, parse, parseDocument, type Node } from "yaml";

import type { Doc, DocSeq } from "../core/index.js";
import { type Pipeline, job, pipeline, ref, render, toDoc } from "./index.js";

/** Header suppressed, the way every golden except the default-header one renders. */
const bare = (value: Pipeline): string => render(value, { header: "" });

const referenced = (): Pipeline =>
  pipeline({
    jobs: [
      job({ name: "build", script: ["npm ci", ref([".setup", "script"])] }),
      job({
        name: "deploy",
        before_script: ref([".setup", "script"]),
        script: "make deploy",
      }),
    ],
  });

const entryOf = (doc: Doc, key: string): Doc => {
  if (doc.kind !== "map") {
    throw new Error(`expected a map holding ${key}`);
  }

  const found = doc.entries.find((item) => item.key === key);

  if (found === undefined) {
    throw new Error(`expected a ${key} entry`);
  }

  return found.value;
};

/** The last item of a sequence, which the script structural test expects to be a sequence. */
const lastSeq = (doc: Doc): DocSeq => {
  if (doc.kind !== "seq") {
    throw new Error("expected a sequence");
  }

  const last = doc.items.at(-1);

  if (last === undefined || last.kind !== "seq") {
    throw new Error("expected the last item to be a sequence");
  }

  return last;
};

interface ParsedReference {
  readonly tag: string | undefined;
  readonly segments: readonly string[];
}

/** The value under `key` in a parsed map, or null when the map or key is not there. */
const mapValue = (node: Node | null, key: string): Node | null => {
  if (!isMap(node)) {
    return null;
  }

  const pair = node.items.find((item) => isScalar(item.key) && item.key.value === key);

  return pair !== undefined && isNode(pair.value) ? pair.value : null;
};

/** The tagged node a rendered document parses back to, as the YAML library sees it. */
const parsedReference = (text: string): ParsedReference => {
  const root = parseDocument(text, { logLevel: "silent" }).contents;
  const script = mapValue(mapValue(root, "build"), "script");
  const item = isSeq(script) ? script.items.find(isSeq) : undefined;

  if (!isSeq(item)) {
    throw new Error("expected a !reference sequence");
  }

  return {
    tag: item.tag,
    segments: item.items.map((segment) => (isScalar(segment) ? String(segment.value) : "")),
  };
};

const segmentValues = (node: DocSeq): readonly string[] =>
  node.items.map((item) => (item.kind === "scalar" ? item.value : ""));

describe("reference", () => {
  it("pins a reference inside a script array and a bare before_script", async () => {
    await expect(bare(referenced())).toMatchFileSnapshot("__snapshots__/reference.yml");
  });

  it("writes the tag on a block sequence, with the path as its items", () => {
    const text = bare(referenced());

    expect(text).toContain("    - !reference\n      - .setup\n      - script\n");
    expect(text).toContain("  before_script: !reference\n    - .setup\n    - script\n");
  });

  it("parses back as the tagged sequence GitLab reads", () => {
    const parsed = parsedReference(bare(referenced()));

    expect(parsed.tag).toBe("!reference");
    expect(parsed.segments).toStrictEqual([".setup", "script"]);
  });

  it("lowers to a tagged sequence, not a scalar", () => {
    const script = entryOf(entryOf(toDoc(referenced()), "build"), "script");
    const node = lastSeq(script);

    expect(node.tag).toBe("!reference");
    expect(segmentValues(node)).toStrictEqual([".setup", "script"]);
  });
});

describe("reference paths", () => {
  it("renders a path that names nothing, without resolving or validating it", () => {
    const text = bare(
      pipeline({
        jobs: [job({ name: "build", script: [ref([".does-not-exist", "script"])] })],
      }),
    );

    expect(text).toBe(
      "build:\n  script:\n    - !reference\n      - .does-not-exist\n      - script\n",
    );
    expect(parsedReference(text).segments).toStrictEqual([".does-not-exist", "script"]);
  });

  it("composes wherever Text and Scalar are accepted", () => {
    const text = bare(
      pipeline({
        jobs: [
          job({
            name: "build",
            image: ref([".images", "node"]),
            variables: { SETUP: ref([".variables", "setup"]) },
            script: ref([".scripts", "build"]),
          }),
        ],
      }),
    );

    expect(text).toBe(
      "build:\n" +
        "  image: !reference\n" +
        "    - .images\n" +
        "    - node\n" +
        "  variables:\n" +
        "    SETUP: !reference\n" +
        "      - .variables\n" +
        "      - setup\n" +
        "  script: !reference\n" +
        "    - .scripts\n" +
        "    - build\n",
    );
  });
});

describe("reference and raw", () => {
  it("keeps raw entries last and the reference bytes unchanged", () => {
    const text = bare(
      pipeline({
        jobs: [
          job({
            name: "build",
            stage: "build",
            script: [ref([".setup", "script"]), "npm run build"],
            raw: { secrets: {} },
          }),
        ],
      }),
    );

    expect(Object.keys(parse(text, { logLevel: "silent" }).build)).toStrictEqual([
      "stage",
      "script",
      "secrets",
    ]);
    expect(parsedReference(text).tag).toBe("!reference");
    expect(text).toContain("  script:\n    - !reference\n      - .setup\n      - script\n");
  });
});
