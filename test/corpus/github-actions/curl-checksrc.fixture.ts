import { type Workflow, job, step, workflow } from "../../../src/github-actions/index.js";

const CHECKOUT = "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1";

const PKG_INSTALL = "$/.github/actions/pkg-install";

const BREW_ENV = 'eval "$(/home/linuxbrew/.linuxbrew/bin/brew shellenv)"';

const ACTIVATE = "source ~/venv/bin/activate";

const CHECKOUT_STEP = step({ uses: CHECKOUT, with: { "persist-credentials": false } });

const ZIZMOR_PREPARE =
  "sed -i.bak -E 's/shell\\x3a .+ zizmor\\x3a ignore.+$/shell\\x3a bash/g' .github/workflows/*.yml";

export const CURL_CHECKSRC: Workflow = workflow({
  name: "Source",
  on: {
    push: {
      branches: ["master", "curl-*", "*/ci"],
      "paths-ignore": ["appveyor.*", "Dockerfile"],
    },
    pull_request: {
      branches: ["master", "curl-*"],
      "paths-ignore": ["appveyor.*", "Dockerfile"],
    },
  },
  concurrency: {
    group: "${{ github.workflow }}-${{ github.event.pull_request.number || github.sha }}",
    "cancel-in-progress": true,
  },
  permissions: {},
  "cache-mode": "none",
  env: { DO_NOT_TRACK: "1" },
  jobs: [
    job({
      id: "checksrc",
      name: "checksrc",
      "runs-on": "ubuntu-slim",
      steps: [CHECKOUT_STEP, step({ name: "check", run: "scripts/checksrc-all.pl" })],
    }),
    job({
      id: "linters",
      name: "spellcheck, linters, REUSE",
      "runs-on": "ubuntu-26.04-arm",
      steps: [
        CHECKOUT_STEP,
        step({
          name: "cmake options in documentation",
          background: true,
          run: "scripts/cmakeopts.sh",
        }),
        step({ name: "labelercheck", background: true, run: ".github/scripts/labelercheck.sh" }),
        step({ name: "perlcheck", background: true, run: "scripts/perlcheck.sh" }),
        step({
          name: "install brew packages",
          background: true,
          "timeout-minutes": 2,
          uses: PKG_INSTALL,
          with: { brew: "pyrefly typos-cli" },
        }),
        step({
          name: "install prereqs",
          uses: PKG_INSTALL,
          with: {
            pip: "-r .github/scripts/requirements.txt\n-r tests/http/requirements.txt\n",
          },
        }),
        step({
          name: "REUSE check",
          background: true,
          run: `${ACTIVATE}\nreuse lint\n`,
        }),
        step({
          name: "cmakelint",
          background: true,
          run: `${ACTIVATE}\nscripts/cmakelint.sh\n`,
        }),
        step({ name: "ruff", background: true, run: `${ACTIVATE}\nscripts/pythonlint.sh\n` }),
        step({ name: "wait-all", "wait-all": null }),
        step({
          name: "pyrefly",
          background: true,
          run:
            `${BREW_ENV}\n` +
            "cd tests/http/\n" +
            "pyrefly check --python-version=3.8 --preset=basic --check-unannotated-defs --summary\n",
        }),
        step({
          name: "filter off code from all C and H files",
          run: "git ls-files -z '**.[ch]' | xargs -0 -r -n1 .github/scripts/c-strip\n",
        }),
        step({
          name: "typos",
          background: true,
          run: `${BREW_ENV}\ntypos --version\n.github/scripts/typos.sh\n`,
        }),
        step({
          name: "codespell",
          run: `${ACTIVATE}\ncodespell --version\n.github/scripts/codespell.sh\n`,
        }),
      ],
    }),
    job({
      id: "pytype",
      name: "pytype",
      "runs-on": "ubuntu-24.04-arm",
      steps: [
        CHECKOUT_STEP,
        step({
          name: "install prereqs",
          uses: PKG_INSTALL,
          with: {
            pip:
              "pytype==2024.10.11\n" +
              "-r .github/scripts/requirements.txt\n" +
              "-r tests/http/requirements.txt\n",
          },
        }),
        step({
          name: "check",
          run: `${ACTIVATE}\nfind . -name '*.py' -exec pytype -j auto -k -- {} +\n`,
        }),
      ],
    }),
    job({
      id: "complexity",
      name: "complexity and function sizes",
      "runs-on": "ubuntu-slim",
      "timeout-minutes": 3,
      steps: [
        step({
          name: "install pmccabe",
          "timeout-minutes": 2,
          uses: PKG_INSTALL,
          with: { apt: "pmccabe" },
        }),
        CHECKOUT_STEP,
        step({ name: "check function complexity", run: "./scripts/top-complexity" }),
        step({ name: "check function lengths", run: "./scripts/top-length" }),
      ],
    }),
    job({
      id: "xmllint",
      name: "xmllint",
      "runs-on": "ubuntu-slim",
      "timeout-minutes": 3,
      steps: [
        step({
          name: "install prereqs",
          "timeout-minutes": 2,
          uses: PKG_INSTALL,
          with: { apt: "libxml2-utils" },
        }),
        CHECKOUT_STEP,
        step({
          name: "check",
          run: "git grep -z -i -l -E '^<\\?xml' | xargs -0 -r xmllint --output /dev/null",
        }),
      ],
    }),
    job({
      id: "miscchecks",
      name: "misc checks",
      "runs-on": "ubuntu-26.04-arm",
      "timeout-minutes": 5,
      steps: [
        step({
          name: "install prereqs",
          "timeout-minutes": 2,
          uses: PKG_INSTALL,
          with: { brew: "shellcheck zizmor" },
        }),
        CHECKOUT_STEP,
        step({ name: "zizmor (prepare)", run: ZIZMOR_PREPARE }),
        step({
          name: "zizmor GHA",
          background: true,
          env: { GH_TOKEN: "${{ secrets.GITHUB_TOKEN }}" },
          run:
            `${BREW_ENV}\n` +
            "git ls-files '.github/actions/**/*.yml' '.github/dependabot.yml' '.github/workflows/*.yml' -z | xargs -0 -r zizmor --persona pedantic --\n",
        }),
        step({
          name: "zizmor GHA (auditor, warning-only)",
          background: true,
          env: { GH_TOKEN: "${{ secrets.GITHUB_TOKEN }}" },
          run:
            `${BREW_ENV}\n` +
            "git ls-files '.github/actions/**/*.yml' '.github/dependabot.yml' '.github/workflows/*.yml' -z | xargs -0 -r zizmor --persona auditor -- || true\n",
        }),
        step({
          name: "shellcheck CI",
          background: true,
          run: `${BREW_ENV}\nshellcheck --version\n.github/scripts/shellcheck-ci.sh\n`,
        }),
        step({
          name: "shellcheck",
          background: true,
          run: `${BREW_ENV}\nshellcheck --version\n.github/scripts/shellcheck.sh\n`,
        }),
        step({ name: "spacecheck", background: true, run: "scripts/spacecheck.pl" }),
        step({ name: "yamlcheck", background: true, run: ".github/scripts/yamlcheck.sh" }),
        step({ name: "badwords", run: "scripts/badwords-all" }),
      ],
    }),
  ],
});
