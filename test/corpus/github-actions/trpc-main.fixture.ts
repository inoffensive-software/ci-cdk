import { type Workflow, job, step, workflow } from "../../../src/github-actions/index.js";

const trpcEnv = {
  TURBO_TOKEN: "${{ secrets.TURBO_TOKEN }}",
  TURBO_TEAM: "${{ vars.TURBO_TEAM }}",
};

const trpcCheckout = step({ uses: "actions/checkout@v7", with: { "fetch-depth": 0 } });

const trpcSetup = step({ uses: "./.github/setup" });

const postgresService = {
  image: "postgres",
  env: {
    POSTGRES_DATABASE: "trpcdb",
    POSTGRES_USER: "postgres",
    POSTGRES_HOST_AUTH_METHOD: "trust",
  },
  ports: ["5432:5432"],
};

const trpcIf = "github.event_name == 'pull_request' || github.event_name == 'merge_group'";

/** The PR pipeline: services, a scalar matrix, workflow concurrency, and a number in `with`. */
export const trpcMain: Workflow = workflow({
  name: "main",
  on: {
    pull_request: { types: ["synchronize", "opened", "reopened"] },
    merge_group: {},
    push: { branches: ["main", "next", "canary"] },
  },
  concurrency: {
    group: "${{ github.workflow }}-${{ github.ref }}",
    "cancel-in-progress": true,
  },
  jobs: [
    job({
      id: "build",
      if: trpcIf,
      "timeout-minutes": 10,
      env: trpcEnv,
      "runs-on": "ubuntu-latest",
      steps: [trpcCheckout, trpcSetup, step({ run: "pnpm build" })],
    }),
    job({
      id: "typecheck",
      if: trpcIf,
      "timeout-minutes": 10,
      env: trpcEnv,
      "runs-on": "ubuntu-latest",
      steps: [trpcCheckout, trpcSetup, step({ run: "pnpm typecheck-packages" })],
    }),
    job({
      id: "typecheck-www",
      if: trpcIf,
      "timeout-minutes": 10,
      env: trpcEnv,
      needs: ["build"],
      "runs-on": "ubuntu-latest",
      steps: [trpcCheckout, trpcSetup, step({ run: "pnpm typecheck-www" })],
    }),
    job({
      id: "test",
      name: "unit and integration tests",
      "timeout-minutes": 10,
      env: trpcEnv,
      "runs-on": "ubuntu-latest",
      steps: [
        trpcCheckout,
        trpcSetup,
        step({ run: "MUTE_REACT_ACT_WARNINGS=1 pnpm test --coverage" }),
        step({
          name: "Verify committed openapi test fixtures",
          run:
            'if [[ -n "$(git status --porcelain -- packages/openapi/test/routers/)" ]]; then\n' +
            '  echo "Generated files in packages/openapi/test/routers/ are out of date."\n' +
            "  echo \"Run 'pnpm -C packages/openapi codegen' locally and commit the resulting changes.\"\n" +
            "  git status --short -- packages/openapi/test/routers/\n" +
            '  echo ""\n' +
            '  echo "Diff for generated fixtures:"\n' +
            "  git --no-pager diff -- packages/openapi/test/routers/\n" +
            "  exit 1\n" +
            "fi\n",
        }),
        step({
          uses: "codecov/codecov-action@v7",
          with: {
            fail_ci_if_error: true,
            token:
              "${{ github.event.pull_request.head.repo.fork == false && secrets.CODECOV_TOKEN || '' }}",
          },
        }),
      ],
    }),
    job({
      id: "e2e",
      if: trpcIf,
      name: "E2E-tests",
      needs: ["build"],
      services: { postgres: postgresService },
      env: {
        NEXTAUTH_SECRET: "supersecret",
        TURBO_TEAM: "${{ vars.TURBO_TEAM }}",
        TURBO_TOKEN: "${{ secrets.TURBO_TOKEN }}",
      },
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 20,
      "continue-on-error": true,
      strategy: {
        matrix: {
          dir: [
            ".experimental/next-app-dir",
            ".test/internal-types-export",
            ".test/ssg",
            "cloudflare-workers",
            "express-minimal",
            "express-server",
            "fastify-server",
            "minimal-react",
            "minimal-per-procedure-errors",
            "next-formdata",
            "next-minimal-starter",
            "next-prisma-starter",
            "next-prisma-todomvc",
            "next-prisma-websockets-starter",
            "openapi-codegen",
            "soa",
            "standalone-server",
            "vercel-edge-runtime",
            "nuxt",
          ],
        },
      },
      steps: [
        trpcCheckout,
        trpcSetup,
        step({ run: "pnpm build" }),
        step({
          run: "cp ./examples/${{ matrix.dir }}/.env.example ./examples/${{ matrix.dir }}/.env || true",
        }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} test-dev" }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} build" }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} typecheck" }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} test-start" }),
      ],
    }),
    job({
      id: "e2e-deno",
      if: trpcIf,
      name: "E2E-tests (Deno)",
      needs: ["build"],
      env: {
        NEXTAUTH_SECRET: "supersecret",
        TURBO_TOKEN: "${{ secrets.TURBO_TOKEN }}",
        TURBO_TEAM: "${{ vars.TURBO_TEAM }}",
      },
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 20,
      "continue-on-error": true,
      strategy: { matrix: { dir: ["deno-deploy"] } },
      steps: [
        trpcCheckout,
        trpcSetup,
        step({ run: "pnpm build" }),
        step({ uses: "denoland/setup-deno@v2.0.5", with: { "deno-version": "2.x" } }),
        step({ run: "deno --version" }),
        step({
          run:
            "cd ./examples/${{ matrix.dir }}\n" +
            'pnpm dlx start-server-and-test "deno run --allow-net=:8000 --allow-env ./src/index.ts" ' +
            'http://127.0.0.1:8000 "deno run --allow-net --allow-env ./src/client.ts"\n',
        }),
      ],
    }),
    job({
      id: "e2e-bun",
      if: trpcIf,
      name: "E2E-tests (Bun)",
      needs: ["build"],
      env: {
        NEXTAUTH_SECRET: "supersecret",
        TURBO_TOKEN: "${{ secrets.TURBO_TOKEN }}",
        TURBO_TEAM: "${{ vars.TURBO_TEAM }}",
      },
      "runs-on": "${{ matrix.os }}",
      "timeout-minutes": 20,
      "continue-on-error": true,
      strategy: { matrix: { dir: ["bun"], os: ["ubuntu-latest"] } },
      steps: [
        trpcCheckout,
        trpcSetup,
        step({ run: "pnpm build" }),
        step({ uses: "oven-sh/setup-bun@v2", with: { "bun-version": "1.4.4" } }),
        step({ run: "bun --version" }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} test-dev" }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} build" }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} typecheck" }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} test-start" }),
      ],
    }),
    job({
      id: "e2e-legacy-node",
      if: trpcIf,
      needs: ["build"],
      services: { postgres: postgresService },
      env: {
        NEXTAUTH_SECRET: "supersecret",
        TURBO_TOKEN: "${{ secrets.TURBO_TOKEN }}",
        TURBO_TEAM: "${{ vars.TURBO_TEAM }}",
      },
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 20,
      "continue-on-error": true,
      strategy: {
        matrix: {
          dir: ["next-prisma-starter", "next-prisma-websockets-starter", "next-prisma-todomvc"],
          "node-start": ["20.x", "22.x"],
        },
      },
      steps: [
        trpcCheckout,
        trpcSetup,
        step({ run: "pnpm build" }),
        step({
          uses: "actions/setup-node@v7",
          with: { "node-version": "${{ matrix.node-start }}", cache: "pnpm" },
        }),
        step({ run: "node -v" }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} test-dev" }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} build" }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} typecheck" }),
        step({ run: "pnpm turbo --filter ./examples/${{ matrix.dir }} test-start" }),
      ],
    }),
    job({
      id: "release-tmp",
      name: "Release using pkg.pr.new",
      if: "github.event_name != 'merge_group'",
      needs: ["build"],
      "runs-on": "ubuntu-latest",
      env: trpcEnv,
      steps: [
        trpcCheckout,
        trpcSetup,
        step({ run: "pnpm build" }),
        step({ run: "pnpx pkg-pr-new publish './packages/*'" }),
      ],
    }),
    job({
      id: "monotest-build",
      name: "Test a monorepo using built declaration files",
      needs: ["build"],
      "runs-on": "ubuntu-latest",
      steps: [trpcCheckout, trpcSetup, step({ run: "pnpm monotest-build" })],
    }),
  ],
});
