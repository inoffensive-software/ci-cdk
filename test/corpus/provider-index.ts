import { GAP_CATEGORIES, type GapCategory } from "../schemas/gap-debt.js";
import { BITBUCKET_SUMMARY } from "./bitbucket-pipelines/provider-summary.js";
import { GITHUB_SUMMARY } from "./github-actions/provider-summary.js";
import { GITLAB_SUMMARY } from "./gitlab-ci/provider-summary.js";
import { coverageOf, type ProviderCoverage } from "./provider-summary.js";
import { formatTable } from "./report.js";

const GAP_LABELS: Readonly<Record<GapCategory, string>> = {
  unmodelled: "Unmodelled",
  "out-of-scope": "Out of scope",
  "schema-noise": "Schema noise",
};

const HEADER: readonly string[] = [
  "Subpath",
  "Provider",
  "Modelled",
  ...GAP_CATEGORIES.map((category) => GAP_LABELS[category]),
];

const share = (count: number, total: number): string =>
  `${((count / total) * 100).toFixed(1)}% (${String(count)})`;

/**
 * The README's provider index, measured from the same schema-gap data as each provider page. The
 * columns partition the documented paths: modelled, then every gap category. Overclaims are counted
 * separately because they sit outside the schema's path set.
 */
const PROVIDERS: readonly ProviderCoverage[] = [
  GITHUB_SUMMARY,
  GITLAB_SUMMARY,
  BITBUCKET_SUMMARY,
].map((summary) => coverageOf(summary));

/** The table plus the sentence that defines every column, both held to the same counts. */
export const renderProviderTable = (): string => {
  const rows = PROVIDERS.map((provider) => [
    `\`${provider.subpath}\``,
    `[${provider.name}](${provider.document}#documented-grammar)`,
    share(provider.modelled, provider.documented),
    ...provider.counts.map((gap) => share(gap.count, provider.documented)),
  ]);

  const note = [
    "Each provider is measured against the grammar in its pinned upstream schema. `Modelled` is the",
    "share of documented paths the provider module can emit. `Unmodelled` is debt, `Out of scope` is a shape",
    "the provider deliberately does not model (usually as it involves some form of YAML sharing primitives - just use code for this). `Schema noise` is grammar the schema permits but the",
    "provider does not document. They may not sum exactly to 100% because of rounding.",
  ].join("\n");

  return `${formatTable(HEADER, rows)}\n\n${note}`;
};
