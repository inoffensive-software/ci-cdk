import { renderDoc, type RenderOptions } from "../core/index.js";
import { toDoc } from "./to-doc.js";
import type { PipelineConfig } from "./types.js";

/** Lowering plus the existing emitter. It adds no options of its own; `header` is forwarded. */
export const render = (config: PipelineConfig, options?: RenderOptions): string =>
  renderDoc(toDoc(config), options);
