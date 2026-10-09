import "server-only";

import { Pool } from "pg";
import { getServerEnvironment } from "@/lib/env/server";

const databaseGlobal = globalThis as typeof globalThis & {
  smeFundReportingPool?: Pool;
};

export function getReportingPool() {
  databaseGlobal.smeFundReportingPool ??= new Pool({
    connectionString: getServerEnvironment().DATABASE_URL,
    max: 2,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
  });
  return databaseGlobal.smeFundReportingPool;
}
