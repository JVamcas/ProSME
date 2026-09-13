import process from "node:process";

import pg from "pg";

const { Client } = pg;

const action = process.argv[2];
const databaseName = process.argv[3];

if (!databaseName || !/^[a-z][a-z0-9_]+$/.test(databaseName)) {
  throw new Error("A safe lowercase test database name is required.");
}

if (action !== "create" && action !== "drop") {
  throw new Error("The action must be create or drop.");
}

const connectionUrl = new URL(process.env.DATABASE_URL);
connectionUrl.pathname = "/postgres";

const client = new Client({
  connectionString: connectionUrl.toString(),
});

await client.connect();

try {
  await client.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);

  if (action === "create") {
    await client.query(`CREATE DATABASE "${databaseName}"`);
  }
} finally {
  await client.end();
}
