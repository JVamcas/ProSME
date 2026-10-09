import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import { IdempotencyConflictError } from "@/lib/resource-errors";
import type { ReportRun } from "../domain/Report";
import { recordReportingAudit } from "./ReportAuditRepository";

export async function enqueueReportRetry(
  actorId: string,
  original: ReportRun,
  idempotencyKey: string,
) {
  return getDatabase().transaction(async (transaction) => {
    const result = await transaction.execute<{ id: string }>(sql`
      INSERT INTO app_reporting_report_runs(report_id, report_name, report_version, template_id,
        template_version, definition, actor_id, trigger, idempotency_key, request_hash,
        values, format, run_at, timezone, website_scope, period, retry_of)
      SELECT report_id, report_name, report_version, template_id, template_version, definition,
        ${actorId}::uuid, 'USER', ${idempotencyKey}::uuid, ${"retry/" + original.id},
        values, format, now(), timezone, website_scope, period, id
      FROM app_reporting_report_runs WHERE id = ${original.id}::uuid AND status = 'FAILED'
      ON CONFLICT (report_id, actor_id, idempotency_key) DO NOTHING RETURNING id
    `);
    if (result.rows[0]) {
      await recordReportingAudit(
        transaction,
        actorId,
        result.rows[0].id,
        "run.retry.queued",
        { retryOf: original.id },
      );
      return result.rows[0];
    }
    const existing = await transaction.execute<{
      id: string;
      requestHash: string;
    }>(sql`
      SELECT id, request_hash AS "requestHash" FROM app_reporting_report_runs
      WHERE report_id = ${original.reportId}::uuid AND actor_id = ${actorId}::uuid AND idempotency_key = ${idempotencyKey}::uuid
    `);
    if (existing.rows[0]?.requestHash !== "retry/" + original.id) {
      throw new IdempotencyConflictError(
        "The retry key belongs to a different request.",
      );
    }
    return { id: existing.rows[0].id };
  });
}
