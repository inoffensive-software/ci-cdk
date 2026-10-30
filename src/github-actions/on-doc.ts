import { fromValue, map, type Doc, type DocEntry } from "../core/index.js";
import type { On, Triggers } from "./trigger.js";

const isTriggers = (on: On): on is Triggers => typeof on === "object" && !Array.isArray(on);

/**
 * The event map keeps the author's order. An event with no options is lowered as `null`, because that
 * is what a bare `push:` in the file means; an empty options map would emit `{}` and read differently.
 */
export const onDoc = (on: On): Doc => {
  if (!isTriggers(on)) {
    return fromValue(on);
  }

  const entries: DocEntry[] = [];

  for (const [event, options] of Object.entries(on)) {
    const bare =
      typeof options === "object" &&
      options !== null &&
      !Array.isArray(options) &&
      Object.keys(options).length === 0;

    entries.push({ key: event, value: fromValue(bare ? null : options) });
  }

  return map(entries);
};
