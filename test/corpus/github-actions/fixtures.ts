import { type Workflow, job, step, workflow } from "../../../src/github-actions/index.js";

/**
 * The definition each vendored config must reproduce, one named export per entry. It lives here
 * rather than in the test so the coverage-debt ledger can walk every fixture in one place.
 *
 * Entries are compared semantically, so a fixture may write a scalar or a collection however the DSL
 * prefers. `got` additionally round-trips byte for byte; its two `raw.run` steps are what buys that,
 * because the modelled `run` field always emits a literal block. See `coverage-debt.ts`.
 */
export const got: Workflow = workflow({
  name: "CI",
  on: ["push", "pull_request"],
  permissions: { contents: "read" },
  jobs: [
    job({
      id: "test",
      name: "Node.js ${{ matrix.node-version }} on ${{ matrix.os }}",
      "runs-on": "${{ matrix.os }}",
      strategy: {
        "fail-fast": false,
        matrix: {
          "node-version": [26, 24, 22],
          os: ["ubuntu-latest"],
        },
      },
      steps: [
        step({ uses: "actions/checkout@v7" }),
        step({
          uses: "actions/setup-node@v7",
          with: { "node-version": "${{ matrix.node-version }}" },
        }),
        step({ raw: { run: "npm install" } }),
        step({ raw: { run: "npm run test" } }),
      ],
    }),
  ],
});

const checkout = step({ uses: "actions/checkout@v7" });

/** The nine-job Rust CI: a reusable-workflow job every other job needs, two matrices, a docs job. */
export const anyhow: Workflow = workflow({
  name: "CI",
  on: {
    push: {},
    pull_request: {},
    workflow_dispatch: {},
    schedule: [{ cron: "40 1 * * *" }],
  },
  permissions: { contents: "read" },
  env: { RUSTFLAGS: "-Dwarnings" },
  jobs: [
    job({ id: "pre_ci", uses: "dtolnay/.github/.github/workflows/pre_ci.yml@master" }),
    job({
      id: "test",
      name: "Rust ${{matrix.rust}}",
      needs: "pre_ci",
      if: "needs.pre_ci.outputs.continue",
      "runs-on": "ubuntu-latest",
      strategy: { "fail-fast": false, matrix: { rust: ["nightly", "beta", "stable", "1.88.0"] } },
      "timeout-minutes": 45,
      steps: [
        checkout,
        step({
          uses: "dtolnay/rust-toolchain@master",
          with: { toolchain: "${{matrix.rust}}", components: "rust-src" },
        }),
        step({
          name: "Enable type layout randomization",
          run: "echo RUSTFLAGS=${RUSTFLAGS}\\ -Zrandomize-layout >> $GITHUB_ENV",
          if: "matrix.rust == 'nightly'",
        }),
        step({
          name: "Enable nightly-only tests",
          run: "echo RUSTFLAGS=${RUSTFLAGS}\\ --cfg=anyhow_nightly_testing >> $GITHUB_ENV",
          if: "matrix.rust == 'nightly'",
        }),
        step({ run: "cargo test" }),
        step({ run: "cargo check --no-default-features" }),
        step({ run: "cargo check" }),
        step({
          uses: "actions/upload-artifact@v7",
          if: "matrix.rust == 'nightly' && always()",
          with: { name: "Cargo.lock", path: "Cargo.lock" },
          "continue-on-error": true,
        }),
      ],
    }),
    job({
      id: "build",
      name: "Rust ${{matrix.rust}}",
      needs: "pre_ci",
      if: "needs.pre_ci.outputs.continue",
      "runs-on": "ubuntu-latest",
      strategy: { "fail-fast": false, matrix: { rust: ["1.68.0"] } },
      "timeout-minutes": 45,
      steps: [
        checkout,
        step({
          uses: "dtolnay/rust-toolchain@master",
          with: { toolchain: "${{matrix.rust}}", components: "rust-src" },
        }),
        step({ run: "cargo check --manifest-path tests/crate/Cargo.toml" }),
        step({ run: "cargo check --manifest-path tests/crate/Cargo.toml --no-default-features" }),
      ],
    }),
    job({
      id: "minimal",
      name: "Minimal versions",
      needs: "pre_ci",
      if: "needs.pre_ci.outputs.continue",
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 45,
      steps: [
        checkout,
        step({ uses: "dtolnay/rust-toolchain@nightly" }),
        step({ run: "cargo generate-lockfile -Z minimal-versions" }),
        step({ run: "cargo check --locked" }),
      ],
    }),
    job({
      id: "windows",
      name: "Windows",
      needs: "pre_ci",
      if: "needs.pre_ci.outputs.continue",
      "runs-on": "windows-latest",
      "timeout-minutes": 45,
      steps: [
        checkout,
        step({ uses: "dtolnay/rust-toolchain@stable", with: { components: "rust-src" } }),
        step({ run: "cargo check" }),
      ],
    }),
    job({
      id: "doc",
      name: "Documentation",
      needs: "pre_ci",
      if: "needs.pre_ci.outputs.continue",
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 45,
      env: { RUSTDOCFLAGS: "-Dwarnings" },
      steps: [
        checkout,
        step({ uses: "dtolnay/rust-toolchain@nightly", with: { components: "rust-src" } }),
        step({ uses: "dtolnay/install@cargo-docs-rs" }),
        step({ run: "cargo docs-rs" }),
      ],
    }),
    job({
      id: "clippy",
      name: "Clippy",
      "runs-on": "ubuntu-latest",
      if: "github.event_name != 'pull_request'",
      "timeout-minutes": 45,
      steps: [
        checkout,
        step({ uses: "dtolnay/rust-toolchain@nightly", with: { components: "clippy, rust-src" } }),
        step({ run: "cargo clippy --tests -- -Dclippy::all -Dclippy::pedantic" }),
      ],
    }),
    job({
      id: "miri",
      name: "Miri",
      needs: "pre_ci",
      if: "needs.pre_ci.outputs.continue",
      "runs-on": "ubuntu-latest",
      "timeout-minutes": 45,
      steps: [
        checkout,
        step({ uses: "dtolnay/rust-toolchain@miri" }),
        step({ run: "cargo miri setup" }),
        step({ run: "cargo miri test", env: { MIRIFLAGS: "-Zmiri-strict-provenance" } }),
      ],
    }),
    job({
      id: "outdated",
      name: "Outdated",
      "runs-on": "ubuntu-latest",
      if: "github.event_name != 'pull_request'",
      "timeout-minutes": 45,
      steps: [
        checkout,
        step({ uses: "dtolnay/rust-toolchain@stable" }),
        step({ uses: "dtolnay/install@cargo-outdated" }),
        step({ run: "cargo outdated --workspace --exit-code 1" }),
      ],
    }),
  ],
});
