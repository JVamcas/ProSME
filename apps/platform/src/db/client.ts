import "server-only";

import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getServerEnvironment } from "@/lib/env/server";
import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;

const databaseGlobal = globalThis as typeof globalThis & {
  smeFundDatabase?: Database;
  smeFundPool?: Pool;
};

export function getDatabase(): Database {
  if (databaseGlobal.smeFundDatabase) {
    return databaseGlobal.smeFundDatabase;
  }

  const pool = new Pool({
    connectionString: getServerEnvironment().DATABASE_URL,
    max: process.env.NODE_ENV === "production" ? 20 : 5,
  });
  const database = drizzle(pool, { schema });

  databaseGlobal.smeFundPool = pool;
  databaseGlobal.smeFundDatabase = database;

  return database;
}
