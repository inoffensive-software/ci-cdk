import { readFileSync } from "node:fs";

import { Ajv, type AnySchema, type ErrorObject, type ValidateFunction } from "ajv";
import { parse } from "yaml";

/** One schema violation, with Ajv's JSON-pointer path and the offending property named when it has one. */
export interface SchemaProblem {
  readonly path: string;
  readonly message: string;
}

/**
 * The vendored schemas are draft-07 (Ajv's default) and community-maintained, with loose unions
 * and keywords Ajv would otherwise warn about. Strict mode is off for that reason, not to excuse
 * a fixture that does not conform.
 */
const ajv = new Ajv({ strict: false, allErrors: true });

const validators = new Map<string, ValidateFunction>();

const validatorFor = (provider: string): ValidateFunction => {
  const cached = validators.get(provider);

  if (cached !== undefined) {
    return cached;
  }

  const schema: AnySchema = JSON.parse(
    readFileSync(new URL(`./${provider}.json`, import.meta.url), "utf8"),
  );

  const validate = ajv.compile(schema);

  validators.set(provider, validate);

  return validate;
};

const describe = (error: ErrorObject): string => {
  const property = error.params["additionalProperty"];

  if (error.keyword === "additionalProperties" && typeof property === "string") {
    return `${error.message ?? "invalid"}: ${JSON.stringify(property)}`;
  }

  return error.message ?? "invalid";
};

/**
 * Parses emitted YAML and validates the data against `test/schemas/<provider>.json`, collecting every
 * violation. The text is the boundary: what the emitter wrote is the only thing under test.
 */
export const problemsFor = (provider: string, text: string): readonly SchemaProblem[] => {
  const validate = validatorFor(provider);
  const document: unknown = parse(text);

  if (validate(document)) {
    return [];
  }

  return (validate.errors ?? []).map((error) => ({
    path: error.instancePath === "" ? "$" : error.instancePath,
    message: describe(error),
  }));
};
