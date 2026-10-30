import {
  type Step,
  type Workflow,
  job,
  step,
  workflow,
} from "../../../src/github-actions/index.js";
import {
  PACKAGE_VSIX,
  PUBLISH_VSIX,
  STAMP_VERSION,
  VALIDATE_BINARIES,
  VALIDATE_PUBLISH_REF,
} from "./turbo-lsp-runs.js";

const CHECKOUT = step({
  name: "Checkout repo",
  uses: "actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5",
  with: {
    ref: "${{ inputs.ref || github.ref }}",
    "persist-credentials": false,
  },
});

const SETUP_NODE = step({
  name: "Setup Node",
  uses: "./.github/actions/setup-node",
  with: { "extra-flags": "--frozen-lockfile" },
});

const download = (name: string, artifact: string): Step =>
  step({
    name,
    uses: "actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093",
    with: {
      name: artifact,
      path: `packages/turbo-vsc/out/artifacts/${artifact}`,
    },
  });

const RUST_BUILD_ENV =
  'CC_aarch64_unknown_linux_musl=clang AR_aarch64_unknown_linux_musl=llvm-ar RUSTFLAGS="-Clink-self-contained=yes -Clinker=rust-lld -Clink-arg=--defsym=__isoc23_sscanf=sscanf -Clink-arg=--defsym=__isoc23_strtol=strtol"';

/** The LSP pipeline: a reusable workflow with typed inputs and object matrix rows. */
export const TURBO_LSP: Workflow = workflow({
  name: "LSP",
  "run-name": "LSP ${{ inputs.ref || github.ref_name }}",
  on: {
    workflow_call: {
      inputs: {
        publish: { type: "boolean", default: false },
        dry_run: { type: "boolean", default: true },
        ref: { type: "string", required: false },
      },
    },
    workflow_dispatch: {
      inputs: {
        publish: {
          description: "Publish the VS Code extension to the Marketplace. Requires dry_run=false.",
          type: "boolean",
          default: false,
        },
        dry_run: {
          description: "Package the VSIX without publishing it.",
          type: "boolean",
          default: true,
        },
        ref: {
          description: "Git ref to package, such as v1.2.3 or v1.2.3-canary.0.",
          required: false,
          type: "string",
        },
      },
    },
  },
  permissions: { contents: "read" },
  env: { TURBO_TELEMETRY_MESSAGE_DISABLED: "1" },
  concurrency: {
    group: "lsp-${{ inputs.ref || github.ref_name }}",
    "cancel-in-progress": false,
  },
  jobs: [
    job({
      id: "build-rust",
      name: "Build Rust",
      strategy: {
        "fail-fast": false,
        matrix: {
          settings: [
            { host: "macos-15-xlarge", target: "x86_64-apple-darwin" },
            { host: "macos-15-xlarge", target: "aarch64-apple-darwin" },
            {
              host: "ubuntu-latest",
              prepare: "sudo apt-get update && sudo apt-get install -y curl musl-tools",
              target: "x86_64-unknown-linux-musl",
              setup: "sudo apt-get install -y build-essential",
            },
            {
              host: "ubuntu-latest",
              target: "aarch64-unknown-linux-musl",
              "rust-build-env": RUST_BUILD_ENV,
              setup:
                "sudo apt-get update && sudo apt-get install -y build-essential musl-tools clang llvm gcc-aarch64-linux-gnu binutils-aarch64-linux-gnu",
            },
            { host: "windows-latest", target: "x86_64-pc-windows-msvc" },
            { host: "windows-latest", target: "aarch64-pc-windows-msvc" },
          ],
        },
      },
      "runs-on": "${{ matrix.settings.host }}",
      "timeout-minutes": 30,
      steps: [
        CHECKOUT,
        step({
          name: "Prepare build environment",
          if: "${{ matrix.settings.prepare }}",
          run: "${{ matrix.settings.prepare }}",
        }),
        step({
          name: "Setup Homebrew dependencies",
          if: "runner.os == 'macOS'",
          run: "brew install bash capnp",
        }),
        step({
          name: "Setup capnproto",
          if: "runner.os != 'macOS'",
          uses: "./.github/actions/setup-capnproto",
        }),
        step({
          name: "Rust Setup",
          uses: "./.github/actions/setup-rust",
          with: {
            "github-token": "${{ github.token }}",
            targets: "${{ matrix.settings.target }}",
          },
        }),
        step({ name: "Setup Zig", uses: "./.github/actions/setup-zig" }),
        step({
          name: "Build Setup",
          shell: "bash",
          if: "${{ matrix.settings.setup }}",
          run: "${{ matrix.settings.setup }}",
        }),
        step({
          name: "Build",
          run:
            "${{ matrix.settings.rust-build-env }} cargo build --profile release-turborepo-lsp " +
            "-p turborepo-lsp --target ${{ matrix.settings.target }}",
        }),
        step({
          name: "Upload Artifacts",
          uses: "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
          with: {
            name: "turborepo-lsp-${{ matrix.settings.target }}",
            path: "target/${{ matrix.settings.target }}/release-turborepo-lsp/turborepo-lsp*",
          },
        }),
      ],
    }),
    job({
      id: "package-vscode",
      name: "Package VS Code Extension",
      "runs-on": "ubuntu-24.04",
      "timeout-minutes": 30,
      needs: ["build-rust"],
      outputs: {
        version: "${{ steps.version.outputs.version }}",
        pre_release: "${{ steps.version.outputs.pre_release }}",
      },
      steps: [
        CHECKOUT,
        step({
          name: "Validate manual publish ref",
          if: "${{ github.event_name == 'workflow_dispatch' && inputs.publish && !inputs.dry_run }}",
          env: { PUBLISH_REF: "${{ inputs.ref || github.ref_name }}" },
          run: VALIDATE_PUBLISH_REF,
        }),
        SETUP_NODE,
        download("Download darwin arm64 LSP", "turborepo-lsp-aarch64-apple-darwin"),
        download("Download darwin x64 LSP", "turborepo-lsp-x86_64-apple-darwin"),
        download("Download linux arm64 LSP", "turborepo-lsp-aarch64-unknown-linux-musl"),
        download("Download linux x64 LSP", "turborepo-lsp-x86_64-unknown-linux-musl"),
        download("Download win32 arm64 LSP", "turborepo-lsp-aarch64-pc-windows-msvc"),
        download("Download win32 x64 LSP", "turborepo-lsp-x86_64-pc-windows-msvc"),
        step({
          name: "Stamp extension version",
          id: "version",
          env: { RELEASE_REF: "${{ inputs.ref }}" },
          run: STAMP_VERSION,
        }),
        step({
          name: "Copy LSP binaries into extension",
          "working-directory": "packages/turbo-vsc",
          run: "pnpm run copy",
        }),
        step({
          name: "Validate packaged binaries",
          "working-directory": "packages/turbo-vsc",
          run: VALIDATE_BINARIES,
        }),
        step({
          name: "Compile extension",
          "working-directory": "packages/turbo-vsc",
          run: "pnpm run check-types",
        }),
        step({
          name: "Package VSIX",
          "working-directory": "packages/turbo-vsc",
          env: {
            PRE_RELEASE: "${{ steps.version.outputs.pre_release }}",
            VERSION: "${{ steps.version.outputs.version }}",
          },
          run: PACKAGE_VSIX,
        }),
        step({
          name: "Upload VSIX",
          uses: "actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02",
          with: {
            name: "turbo-vsc-${{ steps.version.outputs.version }}",
            path: "packages/turbo-vsc/turbo-vsc-${{ steps.version.outputs.version }}.vsix",
          },
        }),
      ],
    }),
    job({
      id: "publish-vscode",
      name: "Publish VS Code Extension",
      "runs-on": "ubuntu-24.04",
      "timeout-minutes": 10,
      needs: ["package-vscode"],
      if: "${{ needs.package-vscode.result == 'success' && inputs.publish && !inputs.dry_run }}",
      environment: "vscode-marketplace",
      steps: [
        CHECKOUT,
        SETUP_NODE,
        step({
          name: "Download VSIX",
          uses: "actions/download-artifact@d3f86a106a0bac45b974a628896c90dbdf5c8093",
          with: {
            name: "turbo-vsc-${{ needs.package-vscode.outputs.version }}",
            path: "packages/turbo-vsc",
          },
        }),
        step({
          name: "Publish VSIX",
          "working-directory": "packages/turbo-vsc",
          env: {
            PRE_RELEASE: "${{ needs.package-vscode.outputs.pre_release }}",
            VERSION: "${{ needs.package-vscode.outputs.version }}",
            VSCE_PAT: "${{ secrets.VSCE_PAT }}",
          },
          run: PUBLISH_VSIX,
        }),
      ],
    }),
  ],
});
