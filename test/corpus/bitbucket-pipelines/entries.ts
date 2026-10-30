import type { PipelineConfig } from "../../../src/bitbucket-pipelines/index.js";
import { ALIGENT_GRAPHQL_MESH } from "./aligent-graphql-mesh.fixture.js";
import { CONNECT_EXPRESS } from "./connect-express.fixture.js";
import { OBUSPA } from "./obuspa.fixture.js";
import { RAIR_DAPP } from "./rair-dapp.fixture.js";
import { SYSTEMSDK_SYMFONY } from "./systemsdk-symfony.fixture.js";

/** One corpus entry: the name the documents use, the vendored file and the definition it pins. */
export interface CorpusEntry {
  readonly name: string;
  readonly file: string;
  readonly config: PipelineConfig;
}

/** The five entries, in the order `PROVENANCE.md` records them. */
export const ENTRIES: readonly CorpusEntry[] = [
  { name: "connect-express", file: "connect-express.yml", config: CONNECT_EXPRESS },
  { name: "systemsdk-symfony", file: "systemsdk-symfony.yml", config: SYSTEMSDK_SYMFONY },
  { name: "obuspa", file: "obuspa.yml", config: OBUSPA },
  { name: "rair-dapp", file: "rair-dapp.yml", config: RAIR_DAPP },
  { name: "aligent-graphql-mesh", file: "aligent-graphql-mesh.yml", config: ALIGENT_GRAPHQL_MESH },
];
