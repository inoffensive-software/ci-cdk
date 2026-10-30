import { describe, expect, it } from "vitest";

import { DOC, DiagnosticError, fromValue, renderDoc, scalar, type Diagnostic } from "./index.js";

class Job {
  readonly name = "build";
}

interface Loop {
  readonly name: string;
  next?: Loop;
}

const diagnosticsOf = (run: () => void): readonly Diagnostic[] => {
  try {
    run();
  } catch (error) {
    if (error instanceof DiagnosticError) {
      return error.diagnostics;
    }

    throw error;
  }

  throw new Error("expected a DiagnosticError");
};

const emitted = (value: Parameters<typeof fromValue>[0]): string =>
  renderDoc(fromValue(value), { header: "" });

const emitWithUndefined = (): void => {
  fromValue({ a: undefined });
};

describe("diagnostics", () => {
  it("reports undefined at the key's own path", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ "runs-on": undefined }));

    expect(diagnostic?.path).toBe('$["runs-on"]');
    expect(diagnostic?.message).toContain("undefined");
  });

  it("reports a function inside an array by index", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ steps: [{ run: () => "x" }] }));

    expect(diagnostic?.path).toBe("$.steps[0].run");
  });

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

  it("rejects NaN and Infinity", () => {
    const diagnostics = diagnosticsOf(() =>
      emitted({ a: Number.NaN, b: Number.POSITIVE_INFINITY }),
    );

    expect(diagnostics.map((diagnostic) => diagnostic.path)).toStrictEqual(["$.a", "$.b"]);
  });

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

  it("gives a diagnostic a hint where one helps", () => {
    const [diagnostic] = diagnosticsOf(() => emitted({ a: undefined }));

    expect(diagnostic?.hint).toContain("omitUndefined");
  });

  it("exposes the formatted diagnostics on the error message", () => {
    expect(emitWithUndefined).toThrow(DiagnosticError);
    expect(emitWithUndefined).toThrow(/\$\.a: undefined/u);
    expect(emitWithUndefined).toThrow(/hint:/u);
  });

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

  it("rejects a header containing a newline", () => {
    const [diagnostic] = diagnosticsOf(() => renderDoc(fromValue({ a: 1 }), { header: "a\nb" }));

    expect(diagnostic?.path).toBe("$");
  });
});
