import { execFileSync } from "node:child_process";

/**
 * Drafting aid for a changelog section: prints the commits since the last tag, oldest first, as
 * `<short sha> <subject>`. It reads the local git history only, so it needs no dependency and no
 * network. It does not classify the commits or write a changelog.
 */
const git = (args: readonly string[]): string => execFileSync("git", args, { encoding: "utf8" });

const lastTag = (): string | null => {
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

const tag = lastTag();
const range = tag === null ? "HEAD" : `${tag}..HEAD`;

process.stdout.write(git(["log", range, "--reverse", "--format=%h %s"]));
