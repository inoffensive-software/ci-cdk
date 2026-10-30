import { type PipelineConfig, pipelineConfig } from "../../../src/bitbucket-pipelines/index.js";

/**
 * The definition `custom-vars-nakama.yml` must reproduce, with YAML aliases resolved and every scalar
 * written in the schema's string form.
 */
export const CUSTOM_VARS_NAKAMA: PipelineConfig = pipelineConfig({
  image: {
    name: "nakamapartneringservices/nakama-pipelines",
    username: "$DOCKER_HUB_USERNAME",
    password: "$DOCKER_HUB_PASSWORD",
  },
  clone: {
    depth: "full",
  },
  pipelines: {
    branches: [
      {
        pattern: "main",
        pipeline: [
          {
            parallel: [
              {
                step: {
                  name: "Deploy INT",
                  deployment: "INT",
                  script: [
                    "source .env.replacements",
                    "export TARGET_ORG=UAT",
                    "sf nakama deploy deltas -o $TARGET_ORG",
                  ],
                  condition: {
                    changesets: {
                      includePaths: ["core/**"],
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      {
        pattern: "rc/*",
        pipeline: [
          {
            step: {
              name: "Deploy UAT",
              deployment: "UAT",
              script: [
                "source .env.replacements",
                "export TARGET_ORG=UAT",
                "sf nakama deploy deltas -o $TARGET_ORG",
              ],
              condition: {
                changesets: {
                  includePaths: ["core/**"],
                },
              },
            },
          },
        ],
      },
    ],
    "pull-requests": [
      {
        pattern: "**",
        pipeline: [
          {
            step: {
              name: "Generate deltas",
              script: ["sf nakama generate deltas"],
              condition: {
                changesets: {
                  includePaths: ["core/**"],
                },
              },
              artifacts: ["deltas/**"],
            },
          },
          {
            parallel: [
              {
                step: {
                  name: "Validate Jest",
                  script: ["sf nakama validate jest"],
                  condition: {
                    changesets: {
                      includePaths: ["**/lwc/**"],
                    },
                  },
                },
              },
              {
                step: {
                  name: "Validate Prettier",
                  script: ["sf nakama validate prettier"],
                },
              },
              {
                step: {
                  name: "Validate recommendations",
                  script: ["sf nakama validate recommendations"],
                },
              },
              {
                step: {
                  name: "Validate flows",
                  script: ["sf nakama validate flows"],
                  condition: {
                    changesets: {
                      includePaths: ["**/flows/**"],
                    },
                  },
                },
              },
              {
                step: {
                  name: "Validate deployment",
                  script: [
                    "PULL_REQUEST_BODY=$(curl -X GET -H \"Authorization:Bearer $PIPELINE_ACCESS_TOKEN\" --url https://api.bitbucket.org/2.0/repositories/$BITBUCKET_REPO_FULL_NAME/pullrequests/$BITBUCKET_PR_ID | jq '.description')",
                    "TESTS_SPECIFICATION=$(awk -F 'Tests:' '{print $2}' <<< \"$PULL_REQUEST_BODY\" | tr -d '\"')",
                    'if [ -z "$TESTS_SPECIFICATION" ]; then\n    TESTS_SPECIFICATION=$(sf nakama decide test level)\n    echo "TEST LEVEL: $TESTS_SPECIFICATION"\nfi\nTESTS_SPECIFICATION_ARRAY=($TESTS_SPECIFICATION)\nTEST_LEVEL=${TESTS_SPECIFICATION_ARRAY[0]}\nTESTS=${TESTS_SPECIFICATION_ARRAY[1]}\nif [ -n "$TESTS" ]; then\n    TESTS_FLAG+="-t $TESTS"\nfi\n',
                    "source .env.replacements",
                    "export TARGET_ORG=PRODUCTION",
                    "sf nakama deploy deltas -o $TARGET_ORG --dry-run true -l $TEST_LEVEL $TESTS_FLAG",
                  ],
                  artifacts: ["results.json"],
                },
              },
            ],
          },
          {
            step: {
              name: "Validate test coverage",
              script: ["sf nakama validate coverage -r 75"],
            },
          },
        ],
      },
    ],
    custom: [
      {
        name: "manual-deployment",
        variables: [
          {
            name: "TARGET_ORG",
            "allowed-values": ["PRODUCTION"],
            default: "PRODUCTION",
          },
          {
            name: "USE_MOST_RECENT",
            "allowed-values": ["true", "false"],
            default: "false",
          },
          {
            name: "DRY_RUN",
            "allowed-values": ["true", "false"],
            default: "true",
          },
          {
            name: "TEST_LEVEL",
            "allowed-values": [
              "NoTestRun",
              "RunSpecifiedTests",
              "RunLocalTests",
              "RunAllTestsInOrg",
              "Default",
            ],
            default: "Default",
          },
          {
            name: "TESTS",
          },
        ],
        pipeline: [
          {
            step: {
              name: "Deploy $TARGET_ORG",
              deployment: "$TARGET_ORG",
              script: [
                "source .env.replacements",
                "export TARGET_ORG=PRODUCTION",
                'if [ -n "$TESTS" ]; then\n    TESTS_FLAG+="-t $TESTS"\nfi\n',
                "sf nakama deploy deltas -o $TARGET_ORG -r $USE_MOST_RECENT --dry-run $DRY_RUN -l $TEST_LEVEL $TESTS_FLAG",
              ],
            },
          },
        ],
      },
      {
        name: "install-package",
        variables: [
          {
            name: "PACKAGE_VERSION_ID",
            default: "04t...",
          },
          {
            name: "INSTALLATION_KEY",
          },
        ],
        pipeline: [
          {
            parallel: [
              {
                step: {
                  name: "Install package",
                  script: [
                    'if [ -n "$INSTALLATION_KEY" ]; then\n    INSTALLATION_KEY_FLAG+="--installation-key $INSTALLATION_KEY"\nfi\n',
                    "sf nakama install package -o INT -p $PACKAGE_VERSION_ID $INSTALLATION_KEY_FLAG",
                  ],
                },
              },
            ],
          },
        ],
      },
      {
        name: "run-apex-tests",
        pipeline: [
          {
            parallel: [
              {
                step: {
                  name: "Validate deployment executing local tests",
                  script: ["sf nakama validate tests -o INT"],
                },
              },
            ],
          },
        ],
      },
    ],
  },
});
