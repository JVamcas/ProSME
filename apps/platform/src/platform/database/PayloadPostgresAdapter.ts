import "server-only";

import { postgresAdapter } from "@payloadcms/db-postgres";
import pg from "pg";

type PayloadPostgresOptions = Parameters<typeof postgresAdapter>[0];

export function createPayloadPostgresAdapter(
  options: Omit<PayloadPostgresOptions, "pg">,
) {
  // Drizzle imports this application's pg driver. Sharing it keeps Pool
  // identity checks valid even when production bundling removes class names.
  // Payload pins older pg declarations with a different event overload.
  // Its driver option accepts the same runtime API used by our shared driver.
  const sharedPg = pg as unknown as NonNullable<PayloadPostgresOptions["pg"]>;
  return postgresAdapter({ ...options, pg: sharedPg });
}
