import { describe, expect, it } from "vitest";

import { type Job, type Workflow, expr, job, render, step, workflow } from "./index.js";

const STEPS = [step({ run: "npm test" })];

const build = (overrides: Partial<Job> = {}): Job =>
  job({ id: "build", "runs-on": "ubuntu-latest", steps: STEPS, ...overrides });

const renderWorkflow = (value: Workflow): string => render(value, { header: "" });

describe("workflow level", () => {
  it("emits permissions, env, defaults and a concurrency group", () => {
    const text = renderWorkflow(
      workflow({
        name: "CI",
        on: "push",
        permissions: { contents: "read", packages: "write" },
        env: { ZEBRA: "z", ALPHA: "a" },
        defaults: { run: { shell: "bash", "working-directory": "app" } },
        concurrency: { group: "ci-main", "cancel-in-progress": true },
        jobs: [build()],
      }),
    );

    expect(text).toContain("permissions:\n  contents: read\n  packages: write\n");
    expect(text).toContain("defaults:\n  run:\n    shell: bash\n    working-directory: app\n");
    expect(text).toContain("concurrency:\n  group: ci-main\n  cancel-in-progress: true\n");
    expect(text.indexOf("ZEBRA:")).toBeLessThan(text.indexOf("ALPHA:"));
  });

  it("accepts permissions as read-all and concurrency as a string", () => {
    const text = renderWorkflow(
      workflow({
        name: "CI",
        on: "push",
        permissions: "read-all",
        concurrency: "ci-main",
        jobs: [build()],
      }),
    );

    expect(text).toContain("permissions: read-all\n");
    expect(text).toContain("concurrency: ci-main\n");
  });
});

describe("job environment", () => {
  it("accepts a string", () => {
    const text = renderWorkflow(
      workflow({ name: "CI", on: "push", jobs: [build({ environment: "production" })] }),
    );

    expect(text).toContain("    environment: production\n");
  });

  it("emits a name and an expression url", () => {
    const text = renderWorkflow(
      workflow({
        name: "CI",
        on: "push",
        jobs: [
          build({
            environment: {
              name: "production",
              url: expr`format('https://{0}', github.repository)`,
            },
          }),
        ],
      }),
    );

    expect(text).toContain(
      "    environment:\n      name: production\n" +
        "      url: \"${{ format('https://{0}', github.repository) }}\"\n",
    );
  });
});

describe("job execution fields", () => {
  it("emits timeout-minutes and continue-on-error unquoted", () => {
    const text = renderWorkflow(
      workflow({
        name: "CI",
        on: "push",
        jobs: [build({ "timeout-minutes": 10, "continue-on-error": false })],
      }),
    );

    expect(text).toContain("    timeout-minutes: 10\n");
    expect(text).toContain("    continue-on-error: false\n");
  });

  it("emits job permissions as a scope map", () => {
    const text = renderWorkflow(
      workflow({
        name: "CI",
        on: "push",
        jobs: [build({ permissions: { contents: "read", "id-token": "write" } })],
      }),
    );

    expect(text).toContain("    permissions:\n      contents: read\n      id-token: write\n");
  });

  it("emits job-level concurrency, env and defaults", () => {
    const text = renderWorkflow(
      workflow({
        name: "CI",
        on: "push",
        jobs: [
          build({
            concurrency: { group: "build", "cancel-in-progress": false },
            env: { ZEBRA: "z", ALPHA: "a" },
            defaults: { run: { shell: "bash" } },
          }),
        ],
      }),
    );

    expect(text).toContain(
      "    concurrency:\n      group: build\n      cancel-in-progress: false\n",
    );
    expect(text.indexOf("ZEBRA:")).toBeLessThan(text.indexOf("ALPHA:"));
    expect(text).toContain("    defaults:\n      run:\n        shell: bash\n");
  });
});

describe("container and services", () => {
  it("emits every container field, with credentials in author order", () => {
    const text = renderWorkflow(
      workflow({
        name: "CI",
        on: "push",
        jobs: [
          build({
            container: {
              image: "node:22",
              credentials: { password: expr`secrets.TOKEN`, username: "ci" },
              env: { NODE_ENV: "test" },
              ports: [8080, "9090"],
              volumes: ["/tmp:/tmp"],
              options: "--cpus 2",
            },
          }),
        ],
      }),
    );

    expect(text).toContain(
      "    container:\n" +
        "      image: node:22\n" +
        "      credentials:\n" +
        '        password: "${{ secrets.TOKEN }}"\n' +
        "        username: ci\n" +
        "      env:\n" +
        "        NODE_ENV: test\n" +
        "      ports:\n" +
        "        - 8080\n" +
        "        - 9090\n" +
        "      volumes:\n" +
        "        - /tmp:/tmp\n" +
        "      options: --cpus 2\n",
    );
  });
});

describe("services", () => {
  it("emits services keyed by their id", () => {
    const text = renderWorkflow(
      workflow({
        name: "CI",
        on: "push",
        jobs: [
          build({
            services: {
              redis: { image: "redis:7", ports: ["6379:6379"] },
            },
          }),
        ],
      }),
    );

    expect(text).toContain(
      "    services:\n" +
        "      redis:\n" +
        "        image: redis:7\n" +
        "        ports:\n" +
        "          - 6379:6379\n",
    );
  });
});

describe("reusable workflow job", () => {
  it("emits uses, with and secrets without runs-on or steps", () => {
    const text = renderWorkflow(
      workflow({
        name: "CI",
        on: "push",
        jobs: [
          job({
            id: "reuse",
            uses: "owner/repo/.github/workflows/reusable.yml@main",
            with: { target: "production" },
            secrets: "inherit",
          }),
        ],
      }),
    );

    expect(text).toContain(
      "  reuse:\n" +
        "    uses: owner/repo/.github/workflows/reusable.yml@main\n" +
        "    with:\n" +
        "      target: production\n" +
        "    secrets: inherit\n",
    );
    expect(text).not.toContain("runs-on:");
    expect(text).not.toContain("steps:");
  });

  it("preserves author order in with and secrets maps", () => {
    const text = renderWorkflow(
      workflow({
        name: "CI",
        on: "push",
        jobs: [
          job({
            id: "reuse",
            uses: "owner/repo/.github/workflows/reusable.yml@main",
            with: { ZEBRA: "z", ALPHA: "a" },
            secrets: { ZEBRA: expr`secrets.Z`, ALPHA: expr`secrets.A` },
          }),
        ],
      }),
    );

    expect(text.indexOf("ZEBRA: z")).toBeLessThan(text.indexOf("ALPHA: a"));
    expect(text.indexOf('ZEBRA: "${{')).toBeLessThan(text.indexOf('ALPHA: "${{'));
  });
});

describe("job shape golden", () => {
  it("pins a container job with a service, an environment with a URL and a reusable workflow job", async () => {
    const ci = workflow({
      name: "CI",
      on: "push",
      permissions: { contents: "read", packages: "write" },
      env: { CI: "true" },
      defaults: { run: { shell: "bash", "working-directory": "app" } },
      concurrency: { group: "ci-${{ github.ref }}", "cancel-in-progress": true },
      jobs: [
        build({
          environment: {
            name: "production",
            url: expr`format('https://{0}', github.repository)`,
          },
          "timeout-minutes": 10,
          "continue-on-error": false,
          container: {
            image: "node:22",
            credentials: { username: "ci", password: expr`secrets.REGISTRY_TOKEN` },
            env: { NODE_ENV: "test" },
            ports: [8080],
            volumes: ["/tmp:/tmp"],
            options: "--cpus 2",
          },
          services: {
            redis: { image: "redis:7", ports: ["6379:6379"] },
          },
        }),
        job({
          id: "reuse",
          uses: "owner/repo/.github/workflows/reusable.yml@main",
          with: { target: "production" },
          secrets: "inherit",
        }),
      ],
    });

    await expect(render(ci)).toMatchFileSnapshot("__snapshots__/job-shape.yml");
  });
});
