import { entry, fromValue, map, present, type Doc } from "../core/index.js";
import type { JobInput, JobInputs } from "./input-types.js";

/** One input declaration in GitLab's documented key order; `default` is never absent. */
const jobInputDoc = (input: JobInput): Doc =>
  map([
    ...entry("type", present(input.type)),
    ...entry("options", present(input.options)),
    ...entry("regex", present(input.regex)),
    ...entry("description", present(input.description)),
    { key: "default", value: fromValue(input.default) },
  ]);

/** The input map keeps the author's order, because each name is their choice and GitLab reads a map. */
export const jobInputsDoc = (inputs: JobInputs): Doc =>
  map(Object.entries(inputs).map(([name, input]) => ({ key: name, value: jobInputDoc(input) })));
