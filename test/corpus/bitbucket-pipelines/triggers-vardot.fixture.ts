import {
  type PipelineConfig,
  step,
  parallel,
  pipelineConfig,
} from "../../../src/bitbucket-pipelines/index.js";

/**
 * The definition `triggers-vardot.yml` must reproduce, with YAML aliases resolved: a `pullrequest-push` trigger that filters the destination branch, then the `all-steps` custom
 * pipeline it starts, built from one sequential step and a three-way parallel group.
 */
export const TRIGGERS_VARDOT: PipelineConfig = pipelineConfig({
  triggers: {
    "pullrequest-push": [
      {
        condition:
          'BITBUCKET_PR_DESTINATION_BRANCH == "dev" || BITBUCKET_PR_DESTINATION_BRANCH == "development" || BITBUCKET_PR_DESTINATION_BRANCH == "stg" || BITBUCKET_PR_DESTINATION_BRANCH == "staging" || BITBUCKET_PR_DESTINATION_BRANCH == "uat" || BITBUCKET_PR_DESTINATION_BRANCH == "master" || BITBUCKET_PR_DESTINATION_BRANCH == "production" || BITBUCKET_PR_DESTINATION_BRANCH == "main"',
        pipelines: ["all-steps"],
      },
    ],
  },
  pipelines: {
    custom: [
      {
        name: "all-steps",
        pipeline: [
          step({
            name: "🛠️ Pipelines Initialization",
            "runs-on": ["self.hosted", "linux.shell", "init"],
            clone: {
              enabled: false,
            },
            script: ['echo "Starting the pipelines..."'],
          }),
          parallel([
            step({
              name: "🧹 Linting & Spell Checking",
              "runs-on": ["self.hosted", "linux.shell", "main", "worker"],
              clone: {
                depth: "full",
              },
              "fail-fast": true,
              script: [
                "git --version",
                "PHP_CHANGED_FILES=$(git diff --name-only --diff-filter=dr origin/$BITBUCKET_PR_DESTINATION_BRANCH...$BITBUCKET_BRANCH | grep -E '(docroot|web)/(modules|themes)/custom/.*\\.(php|module)$' | tr '\\\\n' ' ')",
                "JS_CHANGED_FILES=$(git diff --name-only --diff-filter=dr origin/$BITBUCKET_PR_DESTINATION_BRANCH...$BITBUCKET_BRANCH | grep -E '(docroot|web)/(modules|themes)/custom/.*\\.(js)$' | tr '\\\\n' ' ')",
                "STYLE_CHANGED_FILES=$(git diff --name-only --diff-filter=dr origin/$BITBUCKET_PR_DESTINATION_BRANCH...$BITBUCKET_BRANCH | grep -E '(docroot|web)/(modules|themes)/custom/.*\\.(css)$' | tr '\\\\n' ' ')",
                "TWIG_CHANGED_FILES=$(git diff --name-only --diff-filter=dr origin/$BITBUCKET_PR_DESTINATION_BRANCH...$BITBUCKET_BRANCH | grep -E '(docroot|web)/(modules|themes)/custom/.*\\.(twig)$' | tr '\\\\n' ' ')",
                "TEXT_CHANGED_FILES=$(git diff --name-only --diff-filter=dr origin/$BITBUCKET_PR_DESTINATION_BRANCH...$BITBUCKET_BRANCH | grep -E '(docroot|web)/(modules)/custom/.*\\.(php|module|js|twig|yml|yaml|json|css|scss|sass|md|txt)$' | tr '\\\\n' ' ')",
                'if [ -z "$PHP_CHANGED_FILES" ] && [ -z "$JS_CHANGED_FILES" ] && [ -z "$STYLE_CHANGED_FILES" ] && [ -z "$TWIG_CHANGED_FILES" ] && [ -z "$TEXT_CHANGED_FILES" ]; then',
                'echo "No relevant files changed. Skipping Linting..."',
                "else",
                "cat > .ddev/config.pipeline.yaml << EOF\nweb_environment:\n  - IS_CI=TRUE\n  - PHP_CHANGED_FILES=$PHP_CHANGED_FILES\n  - JS_CHANGED_FILES=$JS_CHANGED_FILES\n  - STYLE_CHANGED_FILES=$STYLE_CHANGED_FILES\n  - TWIG_CHANGED_FILES=$TWIG_CHANGED_FILES\n  - TEXT_CHANGED_FILES=$TEXT_CHANGED_FILES\nEOF\n",
                "chmod 777 .ddev -R",
                "chmod 777 docroot/sites/default -R 2>/dev/null || chmod 777 web/sites/default -R 2>/dev/null || true",
                'export DOCKER_HOST=""',
                "export DOCKER_BUILDKIT=1",
                "ddev -v",
                "ddev poweroff || true",
                "ddev stop --unlist --all --omit-snapshot --remove-data || true",
                "ddev start",
                "ddev auth ssh",
                "ddev composer config --global github-oauth.github.com $GITHUB_TOKEN",
                "ddev composer install --optimize-autoloader",
                'echo "Cleaning up old .ddev command files & Drupal coder"',
                "find .ddev/commands -type f ! -name 'ddev-lint' -delete",
                "rm -rf vendor/drupal/coder",
                "ddev add-on get Vardot/ddev-dev-tools",
                'if [ "$PIPELINES_IS_COREPACKAGE_ENABLED" = "TRUE" ]; then ddev exec "corepack enable"; fi',
                "ddev exec \"if [ -d docroot/core ]; then cd docroot/core && yarn install; elif [ -d web/core ]; then cd web/core && yarn install; else echo 'Neither docroot/core nor web/core found'; exit 1; fi\"",
                "ddev yarn install",
                "ddev dev-lint",
                "fi",
              ],
              "after-script": [
                "chmod 777 .ddev -R || true",
                "chmod 777 docroot/sites/default -R 2>/dev/null || chmod 777 web/sites/default -R 2>/dev/null || true",
                'export DOCKER_HOST=""',
                "export DOCKER_BUILDKIT=1",
                "ddev poweroff || true",
                "ddev stop --unlist --all --omit-snapshot --remove-data || true",
              ],
            }),
            step({
              name: "🚀 Install Drupal & Run E2E Tests",
              "runs-on": ["self.hosted", "linux.shell", "main", "worker"],
              clone: {
                depth: "full",
              },
              "fail-fast": true,
              script: [
                "chmod 777 .ddev -R",
                "chmod 777 docroot/sites/default -R 2>/dev/null || chmod 777 web/sites/default -R 2>/dev/null || true",
                'export DOCKER_HOST=""',
                "export DOCKER_BUILDKIT=1",
                "ddev -v",
                "ddev poweroff || true",
                "ddev stop --unlist --all --omit-snapshot --remove-data || true",
                "ddev start",
                "ddev auth ssh",
                "ddev add-on get Vardot/ddev-dev-tools",
                "ddev restart",
                "ddev install-drupal",
                'PLAYWRIGHT_FILES=$(find tests/playwright -type f \\( -name "*.spec.*" -o -name "*.test.*" -o -name "*.cy.*" \\) 2>/dev/null | wc -l)\nif [ "$PLAYWRIGHT_FILES" -gt 0 ]; then\n  echo "Found $PLAYWRIGHT_FILES Playwright test files. Running Playwright..."\n  ddev playwright-install\n  ddev dev-playwright --workers="${PIPELINES_WORKERS_COUNT:-1}" --max-failures=1\nelse\n  echo "No Playwright test files found under tests/playwright. Checking for Cypress tests..."\n  FEATURE_FILES=$(find cypress -name "*.feature" -type f 2>/dev/null | wc -l)\n  echo "Found $FEATURE_FILES .feature files in cypress folder"\n  if [ "$FEATURE_FILES" -eq 0 ]; then\n    echo "No .feature files found. Skipping automated tests..."\n  else\n    ddev cypress-install\n    ddev cypress-headless\n  fi\nfi\n',
              ],
              artifacts: [
                "tests/playwright-report/**",
                "tests/test-results/**",
                "cypress/screenshots/**",
                "cypress/videos/**",
                "cypress/results/**",
              ],
              "after-script": [
                "chmod 777 .ddev -R || true",
                "chmod 777 docroot/sites/default -R 2>/dev/null || chmod 777 web/sites/default -R 2>/dev/null || true",
                'export DOCKER_HOST=""',
                "export DOCKER_BUILDKIT=1",
                "ddev poweroff || true",
                "ddev stop --unlist --all --omit-snapshot --remove-data || true",
              ],
            }),
            step({
              name: "🧪 PHPUnit Tests",
              "runs-on": ["self.hosted", "linux.shell", "main", "worker"],
              clone: {
                depth: "full",
              },
              "fail-fast": true,
              script: [
                "chmod 777 .ddev -R",
                "chmod 777 docroot/sites/default -R 2>/dev/null || chmod 777 web/sites/default -R 2>/dev/null || true",
                'export DOCKER_HOST=""',
                "export DOCKER_BUILDKIT=1",
                "ddev -v",
                "ddev poweroff || true",
                "ddev stop --unlist --all --omit-snapshot --remove-data || true",
                "ddev start",
                "ddev auth ssh",
                "ddev add-on get Vardot/ddev-dev-tools",
                "ddev restart",
                "ddev dev-phpunit",
              ],
              "after-script": [
                "chmod 777 .ddev -R || true",
                "chmod 777 docroot/sites/default -R 2>/dev/null || chmod 777 web/sites/default -R 2>/dev/null || true",
                'export DOCKER_HOST=""',
                "export DOCKER_BUILDKIT=1",
                "ddev poweroff || true",
                "ddev stop --unlist --all --omit-snapshot --remove-data || true",
              ],
            }),
          ]),
        ],
      },
    ],
  },
});
