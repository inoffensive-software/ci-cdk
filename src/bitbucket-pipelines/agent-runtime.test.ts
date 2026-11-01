import { expect, it } from "vitest";

import { AGENT_RUNTIME } from "../../test/corpus/bitbucket-pipelines/agent-runtime.fixture.js";
import { render } from "./index.js";

it("pins the schema-derived agent runtime document", async () => {
  const text = render(AGENT_RUNTIME, { header: "" });

  expect(text.endsWith("\n")).toBe(true);
  expect(text.endsWith("\n\n")).toBe(false);
  expect(text).not.toContain("\r");
  await expect(text).toMatchFileSnapshot("__snapshots__/agent-runtime.yml");
});
