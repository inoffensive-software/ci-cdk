import { type Workflow, job, workflow } from "../../../src/github-actions/index.js";

export const MINDEE_CRON: Workflow = workflow({
  name: "Crontab",
  on: { schedule: [{ cron: "23 3 * * *", timezone: "Europe/Paris" }] },
  jobs: [
    job({
      id: "test_integrations",
      uses: "mindee/mindee-api-nodejs/.github/workflows/_test-integrations.yml@main",
      secrets: "inherit",
    }),
    job({
      id: "test_smoke",
      uses: "mindee/mindee-api-nodejs/.github/workflows/_test-smoke.yml@main",
      secrets: "inherit",
    }),
  ],
});
