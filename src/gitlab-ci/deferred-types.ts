import type { Text } from "../core/index.js";

/** The `inherit` selector: all of a family, none of it, or the named keys to keep. */
export type InheritSelection = boolean | readonly string[];

/**
 * Which pipeline-wide defaults a job opts into. `default` selects `default:` keywords and `variables`
 * selects the root `variables:`; anything not listed is not inherited. The DSL only emits the map.
 */
export interface Inherit {
  readonly default?: InheritSelection;
  readonly variables?: InheritSelection;
}

/** The runner lifecycle hooks GitLab runs outside the job's own scripts. */
export interface Hooks {
  readonly pre_get_sources_script?: Text | readonly Text[];
}

/** The DAST profiles a job selects; GitLab requires both profile names. */
export interface DastConfiguration {
  readonly site_profile: Text;
  readonly scanner_profile: Text;
}
