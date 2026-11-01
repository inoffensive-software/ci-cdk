import { fromValue, map, type Doc } from "../core/index.js";
import type { IdToken, IdTokens } from "./token-types.js";

/** One ID token carries its audience alone, in GitLab's documented key order. */
const idTokenDoc = (token: IdToken): Doc => map([{ key: "aud", value: fromValue(token.aud) }]);

/** The author-named token map, in record order; each token lowers its own `aud` shape. */
export const idTokensDoc = (tokens: IdTokens): Doc =>
  map(Object.entries(tokens).map(([key, token]) => ({ key, value: idTokenDoc(token) })));
