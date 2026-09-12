import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

export function runBootstrapAdmin(email) {
  const result = spawnSync(
    process.execPath,
    [
      path.resolve("node_modules/payload/bin.js"),
      "run",
      "../../scripts/seed/bootstrap-admin.ts",
    ],
    {
      cwd: path.resolve("apps/platform"),
      encoding: "utf8",
      env: {
        ...process.env,
        BOOTSTRAP_ADMIN_EMAIL: email,
        NODE_OPTIONS: "--conditions=react-server",
      },
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
