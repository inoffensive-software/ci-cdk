import { type Workflow, expr, job, step, workflow } from "../../../src/github-actions/index.js";

/** One inventory document: a definition, plus the name a failure should use for it. */
export interface InventoryDocument {
  readonly name: string;
  readonly workflow: Workflow;
}

/**
 * The set of definitions that between them exercise every key the vocabulary can emit. One document
 * carries everything that can coexist; a shape that cannot share a document with another (`on`,
 * `permissions`, `environment`, `concurrency`, `needs`, `runs-on`, `secrets`) gets its own.
 *
 * The gate renders each document, parses the result and unions the key paths, so this file is the
 * single definition of "modelled". It must not use `raw`; a key it cannot reach through a field is a
 * gap in the vocabulary, not a reason to widen the inventory.
 */
export const INVENTORY: readonly InventoryDocument[] = [
  {
    name: "main",
    workflow: workflow({
      name: "Inventory",
      "run-name": "Inventory ${{ inputs.ref }}",
      on: {
        push: {
          branches: ["main"],
          paths: ["src/**"],
          tags: ["v1"],
        },
        pull_request: {
          types: ["opened"],
          "branches-ignore": ["legacy"],
          "paths-ignore": ["docs/**"],
          "tags-ignore": ["v0"],
        },
        schedule: [{ cron: "0 0 * * *" }],
        workflow_dispatch: {
          inputs: {
            ref: {
              type: "string",
              description: "The ref to build",
              required: true,
              default: "main",
            },
            dry_run: { type: "boolean", description: "Skip the push", default: false },
            target: { type: "choice", options: ["staging", "production"], default: "staging" },
            where: { type: "environment", default: "production" },
          },
        },
        merge_group: {},
        workflow_call: {},
      },
      permissions: { contents: "read", actions: "write" },
      env: { CI: true, NODE_OPTIONS: "--max-old-space-size=4096" },
      defaults: { run: { shell: "bash", "working-directory": "." } },
      concurrency: { group: "inventory-${{ github.ref }}", "cancel-in-progress": true },
      jobs: [
        job({
          id: "call",
          uses: "owner/repo/.github/workflows/reusable.yml@main",
          with: { ref: "main", "fetch-depth": 0 },
          secrets: { token: "${{ secrets.TOKEN }}" },
        }),
        job({
          id: "build",
          name: "Build",
          permissions: { contents: "read", packages: "write" },
          needs: ["call"],
          if: "always()",
          "runs-on": ["ubuntu-latest", "self-hosted"],
          strategy: {
            "fail-fast": false,
            "max-parallel": 2,
            matrix: {
              os: ["ubuntu-latest", "macos-latest"],
              node: [22, 24],
              experimental: [true, false],
              settings: [{ host: "ubuntu-latest", target: "x86_64-unknown-linux-musl" }],
            },
          },
          environment: { name: "production", url: "https://example.com" },
          concurrency: { group: "build", "cancel-in-progress": "${{ inputs.dry_run }}" },
          outputs: { digest: "${{ steps.build.outputs.digest }}" },
          env: { NODE_ENV: "test" },
          defaults: { run: { shell: "bash", "working-directory": "packages/app" } },
          steps: [
            step({
              id: "build",
              name: "Build",
              if: "always()",
              run: "echo build",
              shell: "bash",
              "working-directory": ".",
              env: { FOO: "bar" },
              "continue-on-error": true,
              "timeout-minutes": 5,
            }),
            step({
              name: "Checkout",
              uses: "actions/checkout@v7",
              with: { "fetch-depth": 0, "persist-credentials": false },
              "continue-on-error": false,
            }),
          ],
          "timeout-minutes": 10,
          "continue-on-error": false,
          container: {
            image: "node:24",
            credentials: { username: "user", password: "${{ secrets.REGISTRY_TOKEN }}" },
            env: { NODE_ENV: "test" },
            ports: [8080, "9090"],
            volumes: ["/cache:/cache"],
            options: "--cpus 1",
          },
          services: {
            postgres: {
              image: "postgres:17",
              credentials: { username: "postgres", password: "postgres" },
              env: { POSTGRES_PASSWORD: "postgres" },
              ports: [5432],
              volumes: ["/var/lib/postgresql/data"],
              options: "--health-cmd pg_isready",
            },
          },
        }),
      ],
    }),
  },
  {
    name: "on-string",
    workflow: workflow({
      name: "Inventory: on as a string",
      on: "push",
      jobs: [job({ id: "build", "runs-on": "ubuntu-latest", steps: [step({ run: "true" })] })],
    }),
  },
  {
    name: "on-sequence",
    workflow: workflow({
      name: "Inventory: on as a sequence",
      on: ["push", "pull_request"],
      jobs: [job({ id: "build", "runs-on": "ubuntu-latest", steps: [step({ run: "true" })] })],
    }),
  },
  {
    name: "permissions-token",
    workflow: workflow({
      name: "Inventory: permissions as a token",
      on: "push",
      permissions: "read-all",
      jobs: [job({ id: "build", "runs-on": "ubuntu-latest", steps: [step({ run: "true" })] })],
    }),
  },
  {
    name: "environment-string",
    workflow: workflow({
      name: "Inventory: environment as a name",
      on: "push",
      jobs: [
        job({
          id: "deploy",
          "runs-on": "ubuntu-latest",
          environment: "production",
          steps: [step({ run: "true" })],
        }),
      ],
    }),
  },
  {
    name: "concurrency-string",
    workflow: workflow({
      name: "Inventory: concurrency as a string",
      on: "push",
      concurrency: "ci-${{ github.ref }}",
      jobs: [
        job({
          id: "build",
          "runs-on": "ubuntu-latest",
          concurrency: "build-${{ github.ref }}",
          steps: [step({ run: "true" })],
        }),
      ],
    }),
  },
  {
    name: "needs-string",
    workflow: workflow({
      name: "Inventory: needs as a string",
      on: "push",
      jobs: [
        job({ id: "first", "runs-on": "ubuntu-latest", steps: [step({ run: "true" })] }),
        job({
          id: "second",
          needs: "first",
          "runs-on": "ubuntu-latest",
          steps: [step({ run: "true" })],
        }),
      ],
    }),
  },
  {
    name: "runs-on-string",
    workflow: workflow({
      name: "Inventory: runs-on as a label",
      on: "push",
      jobs: [job({ id: "build", "runs-on": "ubuntu-latest", steps: [step({ run: "true" })] })],
    }),
  },
  {
    name: "runs-on-expression",
    workflow: workflow({
      name: "Inventory: runs-on as an expression leaf",
      on: "push",
      jobs: [
        job({
          id: "build",
          "runs-on": expr`matrix.os`,
          strategy: { matrix: { os: ["ubuntu-latest"] } },
          steps: [step({ run: "true" })],
        }),
      ],
    }),
  },
  {
    name: "workflow-call",
    workflow: workflow({
      name: "Inventory: workflow_call inputs",
      on: {
        workflow_call: {
          inputs: {
            ref: {
              type: "string",
              description: "The ref to build",
              required: true,
              default: "main",
            },
            publish: { type: "boolean", description: "Publish the build", default: false },
          },
        },
      },
      jobs: [job({ id: "build", "runs-on": "ubuntu-latest", steps: [step({ run: "true" })] })],
    }),
  },
  {
    name: "secrets-inherit",
    workflow: workflow({
      name: "Inventory: secrets inherited",
      on: "push",
      jobs: [
        job({
          id: "call",
          uses: "owner/repo/.github/workflows/reusable.yml@main",
          secrets: "inherit",
        }),
      ],
    }),
  },
];
