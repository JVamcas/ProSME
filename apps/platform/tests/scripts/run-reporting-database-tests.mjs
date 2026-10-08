import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import pg from "pg";

// Use a disposable PostgreSQL cluster: migrations also create the restricted reader role.
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must identify a disposable PostgreSQL test cluster.");
}

const root = fileURLToPath(new URL("../../../../", import.meta.url));
const databaseName = `reporting_test_${randomUUID().replaceAll("-", "")}`;
const adminUrl = new URL(process.env.DATABASE_URL);
adminUrl.pathname = "/postgres";
const testUrl = new URL(adminUrl);
testUrl.pathname = `/${databaseName}`;
const admin = new pg.Client({ connectionString: adminUrl.toString() });
const database = new pg.Client({ connectionString: testUrl.toString() });
const journal = JSON.parse(
  await readFile(new URL("../../drizzle/meta/_journal.json", import.meta.url), "utf8"),
);

async function applyMigration(entry) {
  const sql = await readFile(new URL(`../../drizzle/${entry.tag}.sql`, import.meta.url), "utf8");
  await database.query("BEGIN");
  try {
    await database.query(sql);
    await database.query("COMMIT");
  } catch (error) {
    await database.query("ROLLBACK");
    throw new Error(`Migration ${entry.tag} failed: ${error.message}`);
  }
}

async function runTests(files, flags) {
  const child = spawn(
    "npm",
    ["exec", "--workspace", "@prosme/platform", "--", "vitest", "run", ...files],
    {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: testUrl.toString(),
        ...flags,
      },
    },
  );
  await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Reporting PostgreSQL tests exited with code ${code}.`));
      }
    });
  });
}

await admin.connect();
let created = false;
try {
  await admin.query(`CREATE DATABASE "${databaseName}"`);
  created = true;
  await database.connect();
  for (const entry of journal.entries.filter((entry) => entry.idx < 170)) {
    await applyMigration(entry);
  }
  await runTests(["tests/integration/reporting/ReportRetirementPostgres.test.ts"], {
    RUN_REPORTING_RETIREMENT_TESTS: "true",
  });
  const reportingMigrations = journal.entries.filter((entry) => entry.idx >= 170);
  for (const entry of reportingMigrations) {
    await applyMigration(entry);
  }
  for (const entry of reportingMigrations) {
    await applyMigration(entry);
  }
  console.log("Full migration chain and reporting migration reruns passed.");
  await runTests(
    [
      "tests/integration/reporting/ReportDatasetPostgres.test.ts",
      "tests/integration/reporting/WebsiteAnalyticsSyncRepository.test.ts",
      "tests/integration/reporting/WebsiteAnalyticsSnapshotRepository.test.ts",
      "tests/integration/reporting/WebsiteHeatmapRepository.test.ts",
    ],
    { RUN_REPORTING_DATABASE_TESTS: "true" },
  );
} finally {
  await database.end();
  if (created) {
    await admin.query(`DROP DATABASE "${databaseName}" WITH (FORCE)`);
  }
  await admin.end();
}
