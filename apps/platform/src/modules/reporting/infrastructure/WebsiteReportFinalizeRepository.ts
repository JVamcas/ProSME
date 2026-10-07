import "server-only";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import type { WebsiteReportSnapshot } from "../domain/WebsiteReport";
import type { ClaimedWebsiteReport } from "./WebsiteReportClaimRepository";

export async function finalizeWebsiteReport(input: {
  job: ClaimedWebsiteReport;
  snapshot: WebsiteReportSnapshot;
  generatedAt: string;
  nextDueAt: Date;
  capture: (transaction: DatabaseTransaction) => Promise<{
    occurrenceId: string;
    emailTemplate: {
      subjectTemplate: string;
      htmlTemplate: string;
      plainTextTemplate: string;
    };
  }>;
}) {
  return getDatabase().transaction(async (transaction) => {
    // Lock order matches claims/settings, preventing a schedule/run lock inversion.
    const schedule = await transaction.execute(sql`
      SELECT id FROM app_reporting_schedules
      WHERE id = ${input.job.scheduleId}::uuid AND enabled
        AND next_period_start = ${input.job.startDate}::date FOR UPDATE
    `);
    if (!schedule.rows.length) return false;
    const owned = await transaction.execute(sql`
      SELECT id FROM app_reporting_runs WHERE id = ${input.job.id}::uuid
        AND lease_token = ${input.job.leaseToken}::uuid AND lease_expires_at > now()
        AND state = 'PENDING' FOR UPDATE
    `);
    if (!owned.rows.length) return false;
    const captured = await input.capture(transaction);
    const snapshot = {
      ...input.snapshot,
      emailTemplate: captured.emailTemplate,
    };
    await transaction.execute(sql`
      UPDATE app_reporting_runs SET snapshot = ${JSON.stringify(snapshot)}::jsonb,
        generated_at = ${input.generatedAt}::timestamptz, occurrence_id = ${captured.occurrenceId}::uuid,
        state = 'GENERATED', note = NULL, lease_token = NULL, lease_expires_at = NULL
      WHERE id = ${input.job.id}::uuid
    `);
    await transaction.execute(sql`
      UPDATE app_reporting_schedules SET next_period_start = ${input.job.configuration.nextStart}::date,
        next_due_at = ${input.nextDueAt}, updated_at = now()
      WHERE id = ${input.job.scheduleId}::uuid
    `);
    return true;
  });
}
