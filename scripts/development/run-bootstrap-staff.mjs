import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";

export function runBootstrapStaff(email, role = "system_administrator") {
  const result = spawnSync(
    process.execPath,
    [path.resolve("node_modules/payload/bin.js"), "run", "../../scripts/seed/bootstrap-staff.ts"],
    {
      cwd: path.resolve("apps/platform"),
      encoding: "utf8",
      env: {
        ...process.env,
        BOOTSTRAP_STAFF_EMAIL: email,
        BOOTSTRAP_STAFF_ROLE: role,
        NODE_OPTIONS: "--conditions=react-server",
      },
    },
  );
  assert.equal(result.status, 0, result.stderr || result.stdout);
}
