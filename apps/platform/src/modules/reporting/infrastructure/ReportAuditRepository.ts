import "server-only";
import { sql } from "drizzle-orm";
import type { DatabaseTransaction } from "@/platform/database/client";

export async function recordReportingAudit(
  transaction: DatabaseTransaction,
  actorId: string,
  resourceId: string,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  await transaction.execute(sql`
    INSERT INTO app_reporting_audit(actor_id, resource_id, action, metadata)
    VALUES (${actorId}::uuid, ${resourceId}::uuid, ${action}, ${JSON.stringify(metadata)}::jsonb)
  `);
}
