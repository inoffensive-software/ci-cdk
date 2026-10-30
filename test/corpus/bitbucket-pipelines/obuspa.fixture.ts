import {
  type PipelineConfig,
  pipelineConfig,
  step,
} from "../../../src/bitbucket-pipelines/index.js";

/**
 * The definition `obuspa.yml` must reproduce: a root image and clone, then three sequential steps
 * bringing artifacts, self-hosted runner labels and an after-script teardown.
 */
export const OBUSPA: PipelineConfig = pipelineConfig({
  image: "toolsatbbf/obuspa-trixie-build:1",
  clone: { enabled: true },
  pipelines: {
    default: [
      step({
        name: "Build",
        script: [
          "autoreconf --force --install && ./configure && make install",
          "make clean && scan-build -o static_analysis make",
        ],
        artifacts: ["static_analysis/**"],
      }),
      step({
        name: "CDRouter Docker Build",
        "runs-on": ["self.hosted", "linux.shell", "cdrouter"],
        script: ["systemctl status docker", "docker build -t obuspa -f ci/Dockerfile ."],
      }),
      step({
        name: "CDRouter Conformance Test",
        "runs-on": ["self.hosted", "linux.shell", "cdrouter"],
        script: [
          "docker compose -f ci/docker-compose.yml create --force-recreate",
          "ci/cdrouter-runner.py http://localhost 1234 bitbucket-obuspa $BITBUCKET_BUILD_NUMBER",
        ],
        "after-script": [
          "docker compose -f ci/docker-compose.yml down",
          "docker compose -f ci/docker-compose.yml down",
          "unzip -p out/OBUSPA_USP_Conformance_STOMP.zip final.txt            | sed '1,/^Test[[:space:]]*Result/d' | sed '/test(s) run/,$d' | sed '1i STOMP'               > out/conformance_test_results.txt",
          "unzip -p out/OBUSPA_USP_Conformance_STOMPS.zip final.txt           | sed '1,/^Test[[:space:]]*Result/d' | sed '/test(s) run/,$d' | sed '1i STOMP over TLS'     >> out/conformance_test_results.txt",
          "unzip -p out/OBUSPA_USP_Conformance_MQTT.zip final.txt             | sed '1,/^Test[[:space:]]*Result/d' | sed '/test(s) run/,$d' | sed '1i MQTT'               >> out/conformance_test_results.txt",
          "unzip -p out/OBUSPA_USP_Conformance_MQTTS.zip final.txt            | sed '1,/^Test[[:space:]]*Result/d' | sed '/test(s) run/,$d' | sed '1i MQTT over TLS'      >> out/conformance_test_results.txt",
          "unzip -p out/OBUSPA_USP_Conformance_WebSocket.zip final.txt        | sed '1,/^Test[[:space:]]*Result/d' | sed '/test(s) run/,$d' | sed '1i WEBSOCKET'          >> out/conformance_test_results.txt",
          "unzip -p out/OBUSPA_USP_Conformance_Secure_WebSocket.zip final.txt | sed '1,/^Test[[:space:]]*Result/d' | sed '/test(s) run/,$d' | sed '1i WEBSOCKET over TLS' >> out/conformance_test_results.txt",
        ],
        artifacts: ["out/*", "out/conformance_test_results.txt"],
      }),
    ],
  },
});
