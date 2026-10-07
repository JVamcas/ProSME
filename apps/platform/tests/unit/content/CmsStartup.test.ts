import { execFileSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) {
    rmSync(fixture, { recursive: true, force: true });
  }
});

function startStack(args: string[], environment = "local") {
  const root = mkdtempSync(path.join(tmpdir(), "cms-startup-"));
  fixtures.push(root);
  const scripts = path.join(root, "scripts");
  const bin = path.join(root, "bin");
  mkdirSync(scripts);
  mkdirSync(bin);
  mkdirSync(path.join(root, "infrastructure/local"), { recursive: true });
  copyFileSync(path.resolve("../../scripts/docker-up.sh"), path.join(scripts, "docker-up.sh"));
  writeFileSync(path.join(root, ".env"), `ENVIRONMENT=${environment}\n`);
  writeFileSync(path.join(root, "infrastructure/compose.yaml"), "");
  writeFileSync(path.join(root, "infrastructure/local/compose.local.override.yml"), "");
  const maintenance = path.join(scripts, "docker-maintenance.sh");
  writeFileSync(maintenance, "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(maintenance, 0o755);
  const docker = path.join(bin, "docker");
  writeFileSync(docker, `#!/usr/bin/env bash
set -eu
printf '%s\\n' "$*" >> "$CMS_STARTUP_LOG"
case "$*" in
  *' ps -q app') printf 'fixture-app\\n' ;;
  'inspect '*) printf 'healthy\\n' ;;
esac
`);
  chmodSync(docker, 0o755);
  const log = path.join(root, "docker.log");
  execFileSync("bash", [path.join(scripts, "docker-up.sh"), ...args], {
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      ENVIRONMENT: environment,
      CMS_STARTUP_LOG: log,
    },
    encoding: "utf8",
    timeout: 10000,
  });
  return readFileSync(log, "utf8").trim().split("\n");
}

describe("CMS content during stack startup", () => {
  it.each([
    { args: [], environment: "local" },
    { args: ["--build", "--force-recreate"], environment: "dev" },
    { args: ["--fresh"], environment: "local" },
  ])("does not seed during routine startup: $args ($environment)", ({ args, environment }) => {
    const calls = startStack(args, environment);

    expect(calls.some((call) => call.includes(" up -d "))).toBe(true);
    expect(calls.some((call) => call.includes("db:seed"))).toBe(false);
    expect(calls.some((call) => call.includes(" run "))).toBe(false);
  });

  it("seeds once only when baseline initialization is explicitly requested", () => {
    const calls = startStack(["--seed"]);
    const seeds = calls.filter((call) => call.includes("npm run db:seed"));

    expect(seeds).toHaveLength(1);
    expect(seeds[0]).toContain("run --rm --no-deps migrations");
    expect(calls.indexOf(seeds[0])).toBeGreaterThan(
      calls.findIndex((call) => call.includes(" up -d ")),
    );
  });
});
