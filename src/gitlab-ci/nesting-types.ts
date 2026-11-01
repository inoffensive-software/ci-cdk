import type { Scalar, Text } from "../core/index.js";

/**
 * The map form of a variable: the value plus how GitLab treats it. GitLab documents the same object
 * wherever a variable is written, so one shape serves the pipeline, a job, a service and a rule.
 */
export interface VariableOptions {
  readonly value: Scalar;
  readonly expand?: boolean;
  /** The choices the manual Run pipeline page offers; pipeline-level only in GitLab's UI. */
  readonly options?: readonly string[];
  /** The help text the manual Run pipeline page shows. */
  readonly description?: Text;
}

/** A variable is its bare value or the map form; both keep the author's spelling. */
export type Variable = Scalar | VariableOptions;

/** An author-named variable map, in the author's order. */
export type Variables = Readonly<Record<string, Variable>>;

/** The map form of `rules:exists`: paths, or the project/ref/regexp a rule searches elsewhere. */
export interface ExistsOptions {
  readonly paths?: readonly string[];
  readonly project?: Text;
  readonly ref?: Text;
  readonly regexp?: Text;
}

/**
 * `rules:exists` as GitLab writes it: a bare path list, the map form GitLab also documents, or the
 * list a `!reference` tag leaves behind after parsing, which is the same sequence.
 */
export type RuleExists = readonly string[] | ExistsOptions;
