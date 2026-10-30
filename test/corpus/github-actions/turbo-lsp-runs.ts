export const VALIDATE_PUBLISH_REF: string =
  'if [[ ! "$PUBLISH_REF" =~ ^v[0-9]+\\.[0-9]+\\.[0-9]+(-canary\\.[0-9]+)?$ ]]; then\n' +
  '  echo "::error::Marketplace publishes must use a version tag like v1.2.3 or v1.2.3-canary.0."\n' +
  "  exit 1\n" +
  "fi\n";

export const STAMP_VERSION: string =
  "node <<'EOF'\n" +
  'const fs = require("node:fs");\n' +
  "\n" +
  "const version = fs\n" +
  '  .readFileSync("version.txt", "utf8")\n' +
  "  .split(/\\r?\\n/)[0]\n" +
  "  .trim();\n" +
  "const match = version.match(/^(\\d+)\\.(\\d+)\\.(\\d+)(?:-canary\\.(\\d+))?$/);\n" +
  "if (!match) {\n" +
  "  throw new Error(\n" +
  "    `Invalid Turborepo version for VS Code publishing: ${version}`\n" +
  "  );\n" +
  "}\n" +
  "\n" +
  "const [, major, minor, patch, canary] = match;\n" +
  "const patchNumber = Number(patch);\n" +
  "const canaryNumber = canary == null ? null : Number(canary);\n" +
  "const preRelease = canaryNumber != null;\n" +
  "\n" +
  "let marketplaceMajor = Number(major);\n" +
  "let marketplaceMinor = Number(minor);\n" +
  "let marketplacePatch;\n" +
  "if (preRelease) {\n" +
  "  if (patchNumber > 0) {\n" +
  "    marketplacePatch = (patchNumber - 1) * 1000 + canaryNumber + 1;\n" +
  "  } else if (marketplaceMinor > 0) {\n" +
  "    marketplaceMinor -= 1;\n" +
  "    marketplacePatch = 999000 + canaryNumber + 1;\n" +
  "  } else if (marketplaceMajor > 0) {\n" +
  "    marketplaceMajor -= 1;\n" +
  "    marketplaceMinor = 999;\n" +
  "    marketplacePatch = 999000 + canaryNumber + 1;\n" +
  "  } else {\n" +
  "    throw new Error(`Cannot map canary version ${version}`);\n" +
  "  }\n" +
  "} else {\n" +
  "  marketplacePatch = patchNumber * 1000;\n" +
  "}\n" +
  "\n" +
  "if (preRelease && canaryNumber >= 999) {\n" +
  "  throw new Error(\n" +
  "    `Canary version ${version} exceeds the 999 canary releases reserved before the stable version.`\n" +
  "  );\n" +
  "}\n" +
  "\n" +
  "const marketplaceVersion = `${marketplaceMajor}.${marketplaceMinor}.${marketplacePatch}`;\n" +
  "\n" +
  "const releaseRef =\n" +
  "  process.env.RELEASE_REF ||\n" +
  '  (process.env.GITHUB_REF_TYPE === "tag" ? process.env.GITHUB_REF_NAME : "");\n' +
  'if (releaseRef.startsWith("v")) {\n' +
  "  const tagVersion = releaseRef.slice(1);\n" +
  "  if (tagVersion !== version) {\n" +
  "    throw new Error(\n" +
  "      `Release tag ${releaseRef} does not match version.txt ${version}`\n" +
  "    );\n" +
  "  }\n" +
  "}\n" +
  "\n" +
  'const packageJsonPath = "packages/turbo-vsc/package.json";\n' +
  'const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));\n' +
  "packageJson.version = marketplaceVersion;\n" +
  "fs.writeFileSync(\n" +
  "  packageJsonPath,\n" +
  "  `${JSON.stringify(packageJson, null, 2)}\\n`\n" +
  ");\n" +
  "\n" +
  "fs.appendFileSync(\n" +
  "  process.env.GITHUB_OUTPUT,\n" +
  "  `version=${marketplaceVersion}\\npre_release=${preRelease}\\n`\n" +
  ");\n" +
  "EOF\n";

export const VALIDATE_BINARIES: string =
  "test -x out/turborepo-lsp-darwin-arm64\n" +
  "test -x out/turborepo-lsp-darwin-x64\n" +
  "test -x out/turborepo-lsp-linux-arm64\n" +
  "test -x out/turborepo-lsp-linux-x64\n" +
  "test -f out/turborepo-lsp-win32-arm64.exe\n" +
  "test -f out/turborepo-lsp-win32-x64.exe\n";

export const PACKAGE_VSIX: string =
  "PRE_RELEASE_FLAG=()\n" +
  'if [ "$PRE_RELEASE" = "true" ]; then\n' +
  '  PRE_RELEASE_FLAG=("--pre-release")\n' +
  "fi\n" +
  "\n" +
  "COMMIT_SHA=$(git rev-parse HEAD)\n" +
  "pnpm exec vsce package \\\n" +
  "  --no-dependencies \\\n" +
  '  --baseContentUrl "https://github.com/vercel/turborepo/raw/${COMMIT_SHA}/packages/turbo-vsc" \\\n' +
  '  --out "turbo-vsc-${VERSION}.vsix" \\\n' +
  '  "${PRE_RELEASE_FLAG[@]}"\n';

export const PUBLISH_VSIX: string =
  'if [ -z "$VSCE_PAT" ]; then\n' +
  '  echo "::error::VSCE_PAT is required to publish the VS Code extension."\n' +
  "  exit 1\n" +
  "fi\n" +
  "\n" +
  "PRE_RELEASE_FLAG=()\n" +
  'if [ "$PRE_RELEASE" = "true" ]; then\n' +
  '  PRE_RELEASE_FLAG=("--pre-release")\n' +
  "fi\n" +
  "\n" +
  "pnpm exec vsce publish \\\n" +
  '  --packagePath "turbo-vsc-${VERSION}.vsix" \\\n' +
  '  "${PRE_RELEASE_FLAG[@]}"\n';
