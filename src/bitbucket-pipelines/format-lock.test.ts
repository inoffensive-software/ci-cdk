import { describe, expect, it } from "vitest";
import { parse } from "yaml";

import { DEFAULT_HEADER } from "../core/index.js";
import {
  type PipelineConfig,
  type PipelineItem,
  type Stage,
  type Step,
  finalStep,
  parallel,
  pipe,
  pipelineConfig,
  render,
  stage,
  step,
} from "./index.js";

/** Header suppressed, the way every golden except the default-header one renders. */
const bare = (value: PipelineConfig): string => render(value, { header: "" });

/** One step carrying every modelled field, including pipes in both script sequences. */
const richStep = (): Step => ({
  "after-script": [
    "echo teardown",
    pipe({ pipe: "atlassian/default-notify:1", variables: { MESSAGE: ["build", "finished"] } }),
  ],
  artifacts: ["dist/**"],
  caches: ["modules"],
  clone: { depth: 1 },
  condition: { state: "SUCCESSFUL" },
  "concurrency-group": "deploy",
  deployment: "staging",
  environment: "staging",
  "fail-fast": false,
  image: "python:3.12",
  "max-time": 15,
  name: "build",
  oidc: true,
  "runs-on": ["self.hosted"],
  script: [
    "npm ci",
    pipe({
      pipe: "atlassian/aws-s3-deploy:1",
      variables: { LOCAL_PATH: "dist", REMOTE_PATH: ["s3://one", "s3://two"] },
    }),
  ],
  services: ["postgres"],
  size: "4x",
  trigger: "automatic",
});

const richStage = (): Stage => ({
  condition: { changesets: { includePaths: ["src/**", "package.json"] } },
  deployment: "production",
  environment: "production",
  name: "release",
  steps: [step({ name: "publish", script: ["npm publish"] })],
  trigger: "manual",
});

/** The default pipeline: a step, a parallel group, a stage and a final step, in that order. */
const richDefault = (): readonly PipelineItem[] => [
  step(richStep()),
  parallel({
    "fail-fast": true,
    steps: [
      step({ name: "unit", script: ["npm run test:unit"] }),
      step({ name: "lint", script: ["npm run lint"] }),
    ],
  }),
  stage(richStage()),
  finalStep({ name: "cleanup", script: ["echo clean"] }),
];

const richConfig = (): PipelineConfig =>
  pipelineConfig({
    clone: { depth: "full", enabled: true, lfs: true, "skip-ssl-verify": true },
    definitions: {
      caches: {
        modules: "node_modules",
        build: { path: "dist", key: { files: ["package.json", "pnpm-lock.yaml"] } },
      },
      services: {
        postgres: {
          image: "postgres:16",
          memory: 1024,
          type: "docker",
          variables: { POSTGRES_DB: "app", POSTGRES_PASSWORD: "secret" },
        },
      },
      steps: [step({ name: "shared", script: ["echo shared"] })],
    },
    image: { name: "node:22", username: "builder", password: "token" },
    options: { docker: true, "max-time": 60, "runs-on": ["self.hosted", "linux"], size: "2x" },
    pipelines: {
      default: richDefault(),
      branches: [{ pattern: "*", pipeline: [step({ script: ["echo branch"] })] }],
      tags: [{ pattern: "**", pipeline: [step({ script: ["echo tag"] })] }],
      "pull-requests": [{ pattern: "**", pipeline: [step({ script: ["echo pr"] })] }],
      custom: [{ name: "deploy", pipeline: [step({ script: ["echo deploy"] })] }],
    },
  });

/** An empty definitions cache map and an empty pipe variables map, each emitted as `{}`. */
const emptyCollections = (): PipelineConfig =>
  pipelineConfig({
    definitions: { caches: {} },
    pipelines: {
      default: [
        step({ script: ["echo start", pipe({ pipe: "atlassian/example:1", variables: {} })] }),
      ],
    },
  });

const singleStep = (): PipelineConfig =>
  pipelineConfig({ pipelines: { default: [step({ script: ["true"] })] } });

const richParsed = (): ReturnType<typeof parse> => parse(bare(richConfig()));

/** Every golden this file pins, rendered exactly as its snapshot holds it. */
const GOLDENS = {
  "format-rich.yml": () => bare(richConfig()),
  "format-empty-collections.yml": () => bare(emptyCollections()),
} satisfies Record<string, () => string>;

/** Every way `text` breaks the emitted-format contract on bytes; empty when it holds. */
const formatViolations = (text: string): readonly string[] => {
  const violations: string[] = [];
  const lines = text.split("\n");
  const lastLine = lines.length - 1;

  if (text.includes("\r")) {
    violations.push("a carriage return");
  }

  if (!text.endsWith("\n") || text.endsWith("\n\n")) {
    violations.push("not exactly one trailing newline");
  }

  // The final empty line is the trailing newline, not layout. Bitbucket lowers nothing to a block
  // scalar, so every other blank line is a layout bug.
  const blanks = lines.flatMap((line, index) =>
    line.trim() === "" && index !== lastLine ? [index] : [],
  );

  if (blanks.length > 0) {
    violations.push(`a blank line at line ${blanks.join(", ")}`);
  }

  return violations;
};

describe("goldens", () => {
  it.each(Object.entries(GOLDENS))("pins %s", async (file, emit) => {
    const text = emit();

    expect(formatViolations(text)).toStrictEqual([]);
    expect(text).toBe(emit());
    await expect(text).toMatchFileSnapshot(`__snapshots__/${file}`);
  });
});

describe("header", () => {
  it("writes the default header first and starts content on the next line", () => {
    expect(render(singleStep()).split("\n")[0]).toBe(`# ${DEFAULT_HEADER}`);
    expect(render(singleStep()).split("\n")[1]).toBe("pipelines:");
  });

  it("writes no comment line at all when the header is empty", () => {
    const text = render(singleStep(), { header: "" });

    expect(text.startsWith("pipelines:\n")).toBe(true);
    expect(text).not.toContain("#");
  });
});

describe("byte contract", () => {
  it("renders the same document struct identically twice", () => {
    expect(render(richConfig())).toBe(render(richConfig()));
  });
});

describe("selectors", () => {
  it("quotes the * and ** patterns and parses them back as those strings", () => {
    const text = bare(richConfig());
    const parsed = richParsed();

    expect(text).toContain('    "*":');
    expect(Object.keys(parsed.pipelines.branches)).toStrictEqual(["*"]);
    expect(Object.keys(parsed.pipelines.tags)).toStrictEqual(["**"]);
    expect(Object.keys(parsed.pipelines["pull-requests"])).toStrictEqual(["**"]);
    expect(Object.keys(parsed.pipelines.custom)).toStrictEqual(["deploy"]);
  });
});

/** A parsed YAML node; only its keys are read. */
interface ParsedNode {
  readonly step?: unknown;
  readonly parallel?: unknown;
  readonly stage?: unknown;
  readonly final?: unknown;
}

describe("items", () => {
  it("gives each item one form key, a stage its steps sequence and a parallel its step children", () => {
    const text = bare(richConfig());
    const items = richParsed().pipelines.default;

    expect(items.map((item: ParsedNode) => Object.keys(item))).toStrictEqual([
      ["step"],
      ["parallel"],
      ["stage"],
      ["final"],
    ]);
    expect(text).toContain("        steps:\n");
    expect(text).not.toContain("- steps:");
    expect(items[2].stage.steps.map((item: ParsedNode) => Object.keys(item))).toStrictEqual([
      ["step"],
    ]);
    expect(items[1].parallel.steps.map((item: ParsedNode) => Object.keys(item))).toStrictEqual([
      ["step"],
      ["step"],
    ]);
  });
});

describe("pipes and empty collections", () => {
  it("emits a pipe inside a script sequence with variables beneath it", () => {
    const text = bare(richConfig());

    expect(text).toContain("        - pipe: atlassian/aws-s3-deploy:1\n");
    expect(text).toContain("          variables:\n");
    expect(text).toContain("            LOCAL_PATH: dist\n");
    expect(richParsed().pipelines.default[0].step.script).toStrictEqual([
      "npm ci",
      {
        pipe: "atlassian/aws-s3-deploy:1",
        variables: { LOCAL_PATH: "dist", REMOTE_PATH: ["s3://one", "s3://two"] },
      },
    ]);
  });

  it("emits an empty variables map, caches map and artifacts sequence as {} and []", () => {
    const text = bare(emptyCollections());

    const emptyArtifacts = bare(
      pipelineConfig({ pipelines: { default: [step({ artifacts: [], script: ["true"] })] } }),
    );

    expect(text).toContain("        - pipe: atlassian/example:1\n");
    expect(text).toContain("          variables: {}\n");
    expect(text).toContain("  caches: {}\n");
    expect(parse(text).definitions).toStrictEqual({ caches: {} });
    expect(parse(text).pipelines.default[0].step.script[1]).toStrictEqual({
      pipe: "atlassian/example:1",
      variables: {},
    });
    expect(emptyArtifacts).toContain("        artifacts: []\n");
    expect(parse(emptyArtifacts).pipelines.default[0].step.artifacts).toStrictEqual([]);
  });
});

describe("ordering", () => {
  it("emits document, step and nested keys in the spec's order", () => {
    const parsed = richParsed();

    expect(Object.keys(parsed).join(" ")).toBe("clone definitions image options pipelines");
    expect(Object.keys(parsed.definitions).join(" ")).toBe("caches services steps");
    expect(Object.keys(parsed.pipelines).join(" ")).toBe(
      "default branches tags pull-requests custom",
    );
    expect(Object.keys(parsed.options).join(" ")).toBe("docker max-time runs-on size");
    expect(Object.keys(parsed.clone).join(" ")).toBe("depth enabled lfs skip-ssl-verify");
    expect(Object.keys(parsed.pipelines.default[2].stage).join(" ")).toBe(
      "condition deployment environment name steps trigger",
    );
    expect(Object.keys(parsed.pipelines.default[0].step).join(" ")).toBe(
      "after-script artifacts caches clone condition concurrency-group deployment environment " +
        "fail-fast image max-time name oidc runs-on script services size trigger",
    );
  });
});

describe("scalars", () => {
  it("keeps size and depth strings plain and oidc, docker and fail-fast booleans", () => {
    const text = bare(richConfig());
    const step0 = richParsed().pipelines.default[0].step;

    expect(text).toContain("  size: 2x\n");
    expect(text).toContain("  depth: full\n");
    expect(richParsed().options.size).toBe("2x");
    expect(richParsed().clone.depth).toBe("full");
    expect(step0.clone.depth).toBe(1);
    expect(step0.oidc).toBe(true);
    expect(richParsed().options.docker).toBe(true);
    expect(step0["fail-fast"]).toBe(false);
  });
});
