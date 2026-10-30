import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DEFAULT_HEADER } from "../core/index.js";
import { type Pipeline, job, pipeline, render } from "./index.js";

/** Header suppressed, the way every golden except the default-header one renders. */
const bare = (value: Pipeline): string => render(value, { header: "" });

const emptyPipeline = (): Pipeline => pipeline({ jobs: [] });

const stagesOnly = (): Pipeline => pipeline({ stages: ["build", "test"], jobs: [] });

const singleJob = (): Pipeline =>
  pipeline({
    stages: ["build"],
    jobs: [job({ name: "compile", stage: "build", script: "npm run build" })],
  });

const scriptArray = (): Pipeline =>
  pipeline({
    stages: ["test"],
    jobs: [job({ name: "unit", script: ["npm ci", "npm test", "npm run report"] })],
  });

const withTemplates = (): Pipeline =>
  pipeline({
    stages: ["build"],
    templates: {
      ".setup": { before_script: ["npm ci"] },
      ".versions": { parallel: { matrix: [{ TERRAFORM_VERSION: "1.5" }] } },
    },
    jobs: [job({ name: "build", stage: "build", script: ["npm run build"] })],
  });

const rawAtBothLevels = (): Pipeline =>
  pipeline({
    stages: ["build"],
    variables: { CI: "true" },
    jobs: [
      job({
        name: "build",
        stage: "build",
        script: "make",
        artifacts: { paths: ["dist/"] },
        needs: [],
        rules: [{ if: "$CI_COMMIT_BRANCH" }],
      }),
    ],
    raw: {
      image: "node:24",
      ".template": { before_script: ["npm ci"] },
    },
  });

/** One pipeline with every global key set, so the spec's fixed order is pinned on bytes. */
const globals = (): Pipeline =>
  pipeline({
    default: { image: "node:24", tags: ["docker"] },
    include: [{ local: ".gitlab/ci/prepare.yml" }, { component: "gitlab.com/c/danger@1.0" }],
    stages: ["build"],
    variables: { CI: "true" },
    workflow: { rules: [{ if: "$CI_COMMIT_BRANCH" }] },
    templates: { ".setup": { before_script: ["npm ci"] } },
    jobs: [job({ name: "build", stage: "build", script: ["npm run build"] })],
    raw: { image: "node:24" },
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

const quoting = (): Pipeline =>
  pipeline({ jobs: [job({ name: "quotes", script: QUOTED_SCRIPTS })] });

const ordering = (): Pipeline =>
  pipeline({
    stages: ["build", "test"],
    jobs: [
      job({ name: "zulu", stage: "build", script: ["npm ci", "npm run build"] }),
      job({ name: "alpha", stage: "test", script: "npm test", raw: { coverage: "/coverage/" } }),
    ],
  });

/** Every golden this file pins, rendered exactly as its snapshot holds it. */
const GOLDENS = {
  "format-empty-pipeline.yml": () => bare(emptyPipeline()),
  "format-stages-only.yml": () => bare(stagesOnly()),
  "format-single-job.yml": () => bare(singleJob()),
  "format-script-array.yml": () => bare(scriptArray()),
  "format-raw.yml": () => bare(rawAtBothLevels()),
  "format-quoting.yml": () => bare(quoting()),
  "format-ordering.yml": () => bare(ordering()),
  "format-templates.yml": () => bare(withTemplates()),
  "format-globals.yml": () => bare(globals()),
  "format-header-default.yml": () => render(singleJob()),
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
    expect(bare(emptyPipeline())).toBe("{}\n");
  });

  it("pins a stages-only pipeline as the stages sequence and nothing else", () => {
    expect(parse(bare(stagesOnly()))).toStrictEqual({ stages: ["build", "test"] });
  });

  it("pins a single job's string script inline, with no block scalar", () => {
    const text = bare(singleJob());

    expect(text).toContain("  script: npm run build\n");
    expect(text).not.toMatch(/[|>]\s*$/mu);
    expect(parse(text)).toStrictEqual({
      stages: ["build"],
      compile: { stage: "build", script: "npm run build" },
    });
  });

  it("pins a script array in author order", () => {
    expect(parse(bare(scriptArray()))).toStrictEqual({
      stages: ["test"],
      unit: { script: ["npm ci", "npm test", "npm run report"] },
    });
  });

  it("pins every quoting trap back to the string that was written", () => {
    expect(parse(bare(quoting()))).toStrictEqual({ quotes: { script: QUOTED_SCRIPTS } });
  });
});

describe("header", () => {
  it("writes the default header as the first line with no blank line after it", () => {
    const lines = render(singleJob()).split("\n");

    expect(lines[0]).toBe(`# ${DEFAULT_HEADER}`);
    expect(lines[1]).toBe("stages:");
  });

  it("writes no header at all when the header is empty", () => {
    const text = render(singleJob(), { header: "" });

    expect(text.startsWith("stages:\n")).toBe(true);
    expect(text).not.toContain("#");
    expect(text).toBe(bare(singleJob()));
  });
});

describe("ordering", () => {
  it("emits stages before the jobs and the jobs in array order", () => {
    const text = bare(ordering());

    expect(text.startsWith("stages:\n")).toBe(true);
    expect(text.indexOf("zulu:")).toBeLessThan(text.indexOf("alpha:"));
    expect(Object.keys(parse(text))).toStrictEqual(["stages", "zulu", "alpha"]);
  });

  it("emits a job's stage before its script and its raw entries last", () => {
    const parsed = parse(bare(ordering()));

    expect(Object.keys(parsed.zulu)).toStrictEqual(["stage", "script"]);
    expect(Object.keys(parsed.alpha)).toStrictEqual(["stage", "script", "coverage"]);
  });

  it("emits templates after stages and before the jobs, in record order", () => {
    const parsed = parse(bare(withTemplates()));

    expect(Object.keys(parsed)).toStrictEqual(["stages", ".setup", ".versions", "build"]);
  });
});

describe("global ordering", () => {
  it("emits the globals in the spec's order, before the templates and the jobs", () => {
    const parsed = parse(bare(globals()));

    expect(Object.keys(parsed)).toStrictEqual([
      "default",
      "include",
      "stages",
      "variables",
      "workflow",
      ".setup",
      "build",
      "image",
    ]);
  });

  it("emits pipeline raw last, and job raw last, in insertion order", () => {
    const parsed = parse(bare(rawAtBothLevels()));

    expect(Object.keys(parsed)).toStrictEqual([
      "stages",
      "variables",
      "build",
      "image",
      ".template",
    ]);
    expect(Object.keys(parsed.build)).toStrictEqual([
      "stage",
      "needs",
      "rules",
      "artifacts",
      "script",
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
    const value = rawAtBothLevels();

    expect(bare(value)).toBe(bare(value));
  });
});
