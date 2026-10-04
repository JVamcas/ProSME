const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;
const duration = Number(process.argv[2] ?? 1500);
if (
  !connectionString ||
  !new URL(connectionString).pathname.endsWith("_responsiveness_test")
) {
  throw new Error(
    "Business-delay measurements require an isolated responsiveness_test database.",
  );
}
if (!Number.isInteger(duration) || duration < 0 || duration > 10_000) {
  throw new Error("Delay must be an integer between 0 and 10000 milliseconds.");
}

async function main() {
  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '5s'");
    await client.query("LOCK TABLE app_applications IN ACCESS EXCLUSIVE MODE");
    process.stdout.write("locked\n");
    await new Promise((resolve) => setTimeout(resolve, duration));
    await client.query("COMMIT");
  } finally {
    await client.query("ROLLBACK");
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
