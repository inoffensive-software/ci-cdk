import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  DOC,
  DiagnosticError,
  formatDiagnostics,
  fromValue,
  renderDoc,
  scalar,
  type Diagnostic,
} from "./index.js";

const coreDir = import.meta.dirname;

/** `undefined` as data, rather than as an absent argument. */
const absent: undefined = undefined;

class Job {
  readonly name = "build";
}

interface Loop {
  readonly name: string;
  next?: Loop;
}

const errorOf = (run: () => void): DiagnosticError => {
  try {
    run();
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error;
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

const diagnosticsOf = (run: () => void): readonly Diagnostic[] => errorOf(run).diagnostics;

const emitted = (value: Parameters<typeof fromValue>[0]): string =>
  renderDoc(fromValue(value), { header: "" });

const emitWithUndefined = (): void => {
  fromValue({ a: undefined });
};

describe("paths", () => {
  it("reports undefined at the key's own path", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ "runs-on": undefined }));

    expect(diagnostic?.path).toBe('$["runs-on"]');
    expect(diagnostic?.message).toContain("undefined");
  });

  it("reports a function inside an array by index", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ steps: [{ run: () => "x" }] }));

    expect(diagnostic?.path).toBe("$.steps[0].run");
  });

  it("rejects undefined inside an array by index", () => {
    const [diagnostic] = diagnosticsOf(() => emitted([undefined]));

    expect(diagnostic?.path).toBe("$[0]");
  });

  it("rejects undefined at the root", () => {
    const [diagnostic] = diagnosticsOf(() => fromValue(absent));

    expect(diagnostic?.path).toBe("$");
  });

  it("uses one path notation for every shape", () => {
    expect(diagnosticsOf(() => fromValue(absent))[0]?.path).toBe("$");
    expect(diagnosticsOf(() => emitted({ a: undefined }))[0]?.path).toBe("$.a");
    expect(diagnosticsOf(() => emitted({ "runs-on": undefined }))[0]?.path).toBe('$["runs-on"]');
    expect(diagnosticsOf(() => emitted([undefined]))[0]?.path).toBe("$[0]");
  });
});

describe("unsupported objects", () => {
  it("rejects a Date", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ since: new Date(0) }));

    expect(diagnostic?.path).toBe("$.since");
    expect(diagnostic?.message).toContain("Date");
  });

  it("rejects a Map", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ env: new Map([["A", "1"]]) }));

    expect(diagnostic?.path).toBe("$.env");
    expect(diagnostic?.message).toContain("Map");
  });

  it("rejects a class instance", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ job: new Job() }));

    expect(diagnostic?.path).toBe("$.job");
    expect(diagnostic?.message).toContain("Job");
  });

  it("names a class found further up the prototype chain", () => {
    const derived: { readonly name: string } = Object.create(Object.create(Job.prototype));

    const [diagnostic] = diagnosticsOf(() => emitted({ job: derived }));

    expect(diagnostic?.message).toContain("Job");
  });
});

describe("unsupported primitives", () => {
  it("rejects NaN and Infinity", () => {
    const diagnostics = diagnosticsOf(() =>
      emitted({ a: Number.NaN, b: Number.POSITIVE_INFINITY }),
    );

    expect(diagnostics.map((diagnostic) => diagnostic.path)).toStrictEqual(["$.a", "$.b"]);
  });

  it("rejects negative Infinity", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ a: Number.NEGATIVE_INFINITY }));

    expect(diagnostic?.path).toBe("$.a");
    expect(diagnostic?.message).toContain("-Infinity");
  });

  it("rejects a symbol", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ a: Symbol("s") }));

    expect(diagnostic?.path).toBe("$.a");
    expect(diagnostic?.message).toContain("symbols");
  });

  it("rejects a bigint", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ a: 1n }));

    expect(diagnostic?.path).toBe("$.a");
    expect(diagnostic?.message).toContain("bigint");
  });

  it("rejects a Set", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ a: new Set([1]) }));

    expect(diagnostic?.path).toBe("$.a");
    expect(diagnostic?.message).toContain("Set");
  });
});

describe("cycles and collection", () => {
  it("rejects a cycle and names the repeated path", () => {
    const loop: Loop = { name: "loop" };

    loop.next = loop;

    const [diagnostic] = diagnosticsOf(() => fromValue(loop));

    expect(diagnostic?.path).toBe("$.next");
    expect(diagnostic?.message).toContain("circular");
  });

  it("emits a shared, non-ancestor value twice", () => {
    const shared = { name: "shared" };

    expect(emitted({ a: shared, b: shared })).toBe("a:\n  name: shared\nb:\n  name: shared\n");
  });

  it("carries every problem in one throw", () => {
    const diagnostics = diagnosticsOf(() => emitted({ a: undefined, b: () => 1, c: Number.NaN }));

    expect(diagnostics.map((diagnostic) => diagnostic.path)).toStrictEqual(["$.a", "$.b", "$.c"]);
  });
});

describe("formatting", () => {
  it("gives a diagnostic a hint where one helps", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ a: undefined }));

    expect(diagnostic?.hint).toContain("omitUndefined");
  });

  it("exposes the formatted diagnostics on the error message", () => {
    expect(emitWithUndefined).toThrow(DiagnosticError);
    expect(emitWithUndefined).toThrow(/\$\.a: undefined/u);
    expect(emitWithUndefined).toThrow(/hint:/u);
  });

  it("formats one diagnostic per line, with the hint indented under it", () => {
    expect(
      formatDiagnostics([
        { path: "$", message: "boom" },
        { path: "$.a", message: "bad value", hint: "fix it" },
      ]),
    ).toBe("$: boom\n$.a: bad value\n  hint: fix it");
  });

  it("uses formatDiagnostics for the error message", () => {
    const error = errorOf(emitWithUndefined);

    expect(error.message).toBe(formatDiagnostics(error.diagnostics));
    expect(error.name).toBe("DiagnosticError");
  });
});

describe("leaves", () => {
  it("rejects a leaf whose DOC method does not return a node", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ a: { [DOC]: () => 5 } }));

    expect(diagnostic?.path).toBe("$.a");
    expect(diagnostic?.message).toContain("not a Doc");
  });

  it("ignores a DOC symbol inherited from a prototype", () => {
    const inherited = Object.create({ [DOC]: () => scalar("x") }) as { name: string };

    inherited.name = "n";

    expect(() => emitted(inherited)).toThrow(DiagnosticError);
  });
});

describe("header", () => {
  it("rejects a header containing a newline", () => {
    const [diagnostic] = diagnosticsOf(() => renderDoc(fromValue({ a: 1 }), { header: "a\nb" }));

    expect(diagnostic?.path).toBe("$");
    expect(diagnostic?.message).toContain("single line");
  });
});

const coreSources = async (): Promise<readonly string[]> => {
  const entries = await readdir(coreDir, { recursive: true, withFileTypes: true });

  return entries
    .filter(
      (entry) => entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts"),
    )
    .map((entry) => join(entry.parentPath, entry.name))
    .toSorted((left, right) => left.localeCompare(right));
};

/** A cast that narrows a value; `as const` is not one. */
const CAST =
  /\bas\s+(?:readonly\s+)?(?:[A-Z]|\{|\[|\(|string\b|number\b|boolean\b|object\b|unknown\b|never\b|any\b|null\b)/gu;

/** `unknown` as an annotation, not as prose in a comment. */
const UNKNOWN = /\bunknown\b/u;

/** Source with comments removed, so a scan only sees code. */
const withoutComments = (source: string): string =>
  source.replaceAll(/\/\*[\s\S]*?\*\//gu, "").replaceAll(/\/\/.*$/gmu, "");

describe("boundary discipline", () => {
  it("keeps unknown annotations inside the boundary parser", async () => {
    const files = await coreSources();

    const sources = await Promise.all(
      files.map(async (file) => ({ file, text: await readFile(file, "utf8") })),
    );

    const offenders = sources.filter((source) => UNKNOWN.test(withoutComments(source.text)));

    expect(offenders.map((source) => source.file)).toStrictEqual([join(coreDir, "from-value.ts")]);
  });

  it("scans the core sources", async () => {
    expect(await coreSources()).not.toHaveLength(0);
  });

  it("narrows unknown with type guards rather than casts", async () => {
    const source = await readFile(join(coreDir, "from-value.ts"), "utf8");

    expect([...withoutComments(source).matchAll(CAST)]).toStrictEqual([]);
  });
});
