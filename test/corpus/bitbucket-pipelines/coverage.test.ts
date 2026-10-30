import type { PipelineConfig, PipelineItem } from "../../../src/bitbucket-pipelines/index.js";
import { describeCoverageDebt } from "../coverage.js";
import { keyPath } from "../paths.js";
import { COVERAGE_DEBT } from "./coverage-debt.js";
import { CONNECT_EXPRESS } from "./connect-express.fixture.js";

/** Every pipeline item a document declares, in the order the document reaches them. */
const itemsOf = (config: PipelineConfig): readonly PipelineItem[] => [
  ...(config.pipelines.default ?? []),
  ...(config.pipelines.branches ?? []).flatMap((section) => section.pipeline),
];

/** Every raw key a fixture wrote, at the level it wrote it. */
const rawPathsOf = (config: PipelineConfig): readonly string[] => {
  const paths = Object.keys(config.raw ?? {}).map((key) => keyPath("$.raw", key));

  for (const [index, item] of itemsOf(config).entries()) {
    paths.push(
      ...Object.keys(item.step.raw ?? {}).map((key) => keyPath(`$.items[${index}].raw`, key)),
    );
  }

  return paths;
};

const PIPELINES = [CONNECT_EXPRESS];

describeCoverageDebt({ fixtures: PIPELINES, rawPathsOf, debt: COVERAGE_DEBT });
