export interface Diagnostic {
  readonly path: string;
  readonly message: string;
  readonly hint?: string;
}

const formatDiagnostic = (diagnostic: Diagnostic): string => {
  const head = `${diagnostic.path}: ${diagnostic.message}`;

  if (diagnostic.hint === undefined) {
    return head;
  }

  return `${head}\n  hint: ${diagnostic.hint}`;
};

/** One diagnostic per line, `path: message`, with an indented hint when present. */
export const formatDiagnostics = (diagnostics: readonly Diagnostic[]): string =>
  diagnostics.map((diagnostic) => formatDiagnostic(diagnostic)).join("\n");

export class DiagnosticError extends Error {
  readonly diagnostics: readonly Diagnostic[];

  constructor(diagnostics: readonly Diagnostic[]) {
    super(formatDiagnostics(diagnostics));
    this.name = "DiagnosticError";
    this.diagnostics = diagnostics;
  }
}

export const fail = (...diagnostics: Diagnostic[]): never => {
  throw new DiagnosticError(diagnostics);
};
