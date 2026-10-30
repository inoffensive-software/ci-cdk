import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DEFAULT_HEADER } from "../core/index.js";
import { type Pipeline, job, pipeline, render } from "./index.js";

/** Header suppressed, the way every golden except the default-header one renders. */
const bare = (value: Pipeline): string => render(value, { header: "" });

const EMPTY_PIPELINE = (): Pipeline => pipeline({ jobs: [] });

const STAGES_ONLY = (): Pipeline => pipeline({ stages: ["build", "test"], jobs: [] });

const SINGLE_JOB = (): Pipeline =>
  pipeline({
    stages: ["build"],
    jobs: [job({ name: "compile", stage: "build", script: "npm run build" })],
  });

const SCRIPT_ARRAY = (): Pipeline =>
  pipeline({
    stages: ["test"],
    jobs: [job({ name: "unit", script: ["npm ci", "npm test", "npm run report"] })],
  });

const RAW_AT_BOTH_LEVELS = (): Pipeline =>
  pipeline({
    stages: ["build"],
    jobs: [
      job({
        name: "build",
        stage: "build",
        script: "make",
        raw: { needs: [], rules: [{ if: "$CI_COMMIT_BRANCH" }], artifacts: { paths: ["dist/"] } },
      }),
    ],
    raw: {
      image: "node:24",
      variables: { CI: "true" },
      ".template": { before_script: ["npm ci"] },
    },
  });

/** One string per YAML trap the serializer has to quote, plus a multi-line command. */
const QUOTED_SCRIPTS = [
  "echo done: now",
  "echo done # note",
  "- not a sequence item",
  "yes",
  "no",
  "1.10",
  "echo one\necho two",
] as const;

const QUOTING = (): Pipeline =>
  pipeline({ jobs: [job({ name: "quotes", script: QUOTED_SCRIPTS })] });

const ORDERING = (): Pipeline =>
  pipeline({
    stages: ["build", "test"],
    jobs: [
      job({ name: "zulu", stage: "build", script: ["npm ci", "npm run build"] }),
      job({ name: "alpha", stage: "test", script: "npm test", raw: { coverage: "/coverage/" } }),
    ],
  });

/** Every golden this file pins, rendered exactly as its snapshot holds it. */
const GOLDENS = {
  "format-empty-pipeline.yml": () => bare(EMPTY_PIPELINE()),
  "format-stages-only.yml": () => bare(STAGES_ONLY()),
  "format-single-job.yml": () => bare(SINGLE_JOB()),
  "format-script-array.yml": () => bare(SCRIPT_ARRAY()),
  "format-raw.yml": () => bare(RAW_AT_BOTH_LEVELS()),
  "format-quoting.yml": () => bare(QUOTING()),
  "format-ordering.yml": () => bare(ORDERING()),
  "format-header-default.yml": () => render(SINGLE_JOB()),
} satisfies Record<string, () => string>;

/** A block scalar's header line: a key or dash, then `|` or `>`, then an optional chomping hint. */
const BLOCK_SCALAR_HEADER = /(?:^|: |- )[|>][+-]?\d*$/u;

const indentOf = (line: string): number => line.length - line.trimStart().length;

/** Line numbers of blank lines that sit outside a block scalar; block content may contain them. */
const blankLinesOutsideBlockScalars = (text: string): readonly number[] => {
  const blanks: number[] = [];
  let blockIndent: number | null = null;

  for (const [index, line] of text.split("\n").entries()) {
    const insideBlock =
      blockIndent !== null && (line.trim() === "" || indentOf(line) > blockIndent);

    if (insideBlock) {
      continue;
    }

    blockIndent = null;

    if (line.trim() === "") {
      blanks.push(index);

      continue;
    }

    if (BLOCK_SCALAR_HEADER.test(line)) {
      blockIndent = indentOf(line);
    }
  }

  return blanks;
};

/** Every way `text` breaks the emitted-format contract on bytes; empty when it holds. */
const formatViolations = (text: string): readonly string[] => {
  const violations: string[] = [];
  const lastLine = text.split("\n").length - 1;

  if (text.includes("\r")) {
    violations.push("a carriage return");
  }

  if (!text.endsWith("\n")) {
    violations.push("no trailing newline");
  }

  if (text.endsWith("\n\n")) {
    violations.push("more than one trailing newline");
  }

  // The final empty line is the single trailing newline, not layout.
  const blanks = blankLinesOutsideBlockScalars(text).filter((index) => index !== lastLine);

  if (blanks.length > 0) {
    violations.push(`a blank line at line ${blanks.join(", ")}`);
  }

  // Flow style appears for the empty collections only; every other collection is block style.
  if (/[{}[\]]/u.test(text.replaceAll("{}", "").replaceAll("[]", ""))) {
    violations.push("flow style that is not empty");
  }

  return violations;
};

describe("goldens", () => {
  it.each(Object.entries(GOLDENS))("pins %s", async (file, emit) => {
    await expect(emit()).toMatchFileSnapshot(`__snapshots__/${file}`);
  });

  it("pins an empty pipeline as {} with one trailing newline", () => {
    expect(bare(EMPTY_PIPELINE())).toBe("{}\n");
  });

  it("pins a stages-only pipeline as the stages sequence and nothing else", () => {
    expect(parse(bare(STAGES_ONLY()))).toStrictEqual({ stages: ["build", "test"] });
  });

  it("pins a single job's string script inline, with no block scalar", () => {
    const text = bare(SINGLE_JOB());

    expect(text).toContain("  script: npm run build\n");
    expect(text).not.toMatch(/[|>]\s*$/mu);
    expect(parse(text)).toStrictEqual({
      stages: ["build"],
      compile: { stage: "build", script: "npm run build" },
    });
  });

  it("pins a script array in author order", () => {
    expect(parse(bare(SCRIPT_ARRAY()))).toStrictEqual({
      stages: ["test"],
      unit: { script: ["npm ci", "npm test", "npm run report"] },
    });
  });

  it("pins every quoting trap back to the string that was written", () => {
    expect(parse(bare(QUOTING()))).toStrictEqual({ quotes: { script: QUOTED_SCRIPTS } });
  });
});

describe("header", () => {
  it("writes the default header as the first line with no blank line after it", () => {
    const lines = render(SINGLE_JOB()).split("\n");

    expect(lines[0]).toBe(`# ${DEFAULT_HEADER}`);
    expect(lines[1]).toBe("stages:");
  });

  it("writes no header at all when the header is empty", () => {
    const text = render(SINGLE_JOB(), { header: "" });

    expect(text.startsWith("stages:\n")).toBe(true);
    expect(text).not.toContain("#");
    expect(text).toBe(bare(SINGLE_JOB()));
  });
});

describe("ordering", () => {
  it("emits stages before the jobs and the jobs in array order", () => {
    const text = bare(ORDERING());

    expect(text.startsWith("stages:\n")).toBe(true);
    expect(text.indexOf("zulu:")).toBeLessThan(text.indexOf("alpha:"));
    expect(Object.keys(parse(text) as object)).toStrictEqual(["stages", "zulu", "alpha"]);
  });

  it("emits a job's stage before its script and its raw entries last", () => {
    const parsed = parse(bare(ORDERING())) as { zulu: object; alpha: object };

    expect(Object.keys(parsed.zulu)).toStrictEqual(["stage", "script"]);
    expect(Object.keys(parsed.alpha)).toStrictEqual(["stage", "script", "coverage"]);
  });

  it("emits pipeline raw last, and job raw last, in insertion order", () => {
    const parsed = parse(bare(RAW_AT_BOTH_LEVELS())) as { build: object };

    expect(Object.keys(parsed)).toStrictEqual([
      "stages",
      "build",
      "image",
      "variables",
      ".template",
    ]);
    expect(Object.keys(parsed.build)).toStrictEqual([
      "stage",
      "script",
      "needs",
      "rules",
      "artifacts",
    ]);
  });
});

describe("byte contract", () => {
  it.each(Object.entries(GOLDENS))("%s is LF only, one newline, no blank lines", (_file, emit) => {
    expect(formatViolations(emit())).toStrictEqual([]);
  });

  it.each(Object.entries(GOLDENS))("%s renders identically twice", (_file, emit) => {
    expect(emit()).toBe(emit());
  });

  it("renders the same pipeline struct identically twice", () => {
    const value = RAW_AT_BOTH_LEVELS();

    expect(bare(value)).toBe(bare(value));
  });
});
