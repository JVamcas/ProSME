import "server-only";
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import {
  getDatabase,
  type DatabaseTransaction,
} from "@/platform/database/client";
import type { ReportArtifact, ReportRun } from "../domain/Report";
import { normalizeReportRun, runSelection } from "./ReportRunRepository";
import { recordReportingAudit } from "./ReportAuditRepository";

export type PendingReportOutput = Omit<ReportArtifact, "id" | "runId"> & {
  rows: number;
};
export type ClaimedReportRun = ReportRun & {
  attempts: number;
  pendingOutput: PendingReportOutput | null;
};

export async function claimReportRun(): Promise<ClaimedReportRun | null> {
  const token = randomUUID();
  const result = await getDatabase().execute<ClaimedReportRun>(sql`
    WITH candidate AS (
      SELECT id FROM app_reporting_report_runs
      WHERE status IN ('QUEUED', 'PREPARING_SOURCE', 'RUNNING') AND available_at <= now()
        AND (lease_until IS NULL OR lease_until < now())
      ORDER BY created_at, id FOR UPDATE SKIP LOCKED LIMIT 1
    )
    UPDATE app_reporting_report_runs run SET lease_token = ${token}::uuid,
      lease_until = now() + interval '180 seconds', attempts = attempts + 1
    WHERE run.id IN (SELECT id FROM candidate)
    RETURNING ${runSelection}, attempts, pending_output AS "pendingOutput"
  `);
  return result.rows[0] ? normalizeReportRun(result.rows[0]) : null;
}
async function insertEvent(
  transaction: DatabaseTransaction,
  run: ReportRun,
  key: string,
  metadata: Record<string, unknown>,
) {
  await transaction.execute(sql`
    INSERT INTO app_reporting_run_events(run_id, key, metadata)
    VALUES (${run.id}::uuid, ${key}, ${JSON.stringify(metadata)}::jsonb) ON CONFLICT (run_id, key) DO NOTHING
  `);
}
export async function startReportRun(run: ReportRun) {
  return getDatabase().transaction(async (transaction) => {
    const result = await transaction.execute(sql`
      UPDATE app_reporting_report_runs SET status = 'RUNNING', started_at = coalesce(started_at, now())
      WHERE id = ${run.id}::uuid AND lease_token = ${run.leaseToken}::uuid AND lease_until > now()
        AND status IN ('QUEUED', 'PREPARING_SOURCE', 'RUNNING') RETURNING id
    `);
    if (!result.rows.length) {
      return false;
    }
    await insertEvent(transaction, run, "reporting.generation.started", {
      trigger: "USER",
      actorId: run.actorId,
    });
    return true;
  });
}
export async function deferReportSource(run: ReportRun) {
  await getDatabase().execute(sql`
    UPDATE app_reporting_report_runs SET status = 'PREPARING_SOURCE', lease_token = NULL, lease_until = NULL,
      available_at = now() + interval '60 seconds'
    WHERE id = ${run.id}::uuid AND lease_token = ${run.leaseToken}::uuid
  `);
}
export async function checkpointReportOutput(
  run: ReportRun,
  pending: PendingReportOutput,
) {
  const result = await getDatabase().execute(sql`
    UPDATE app_reporting_report_runs SET pending_output = ${JSON.stringify(pending)}::jsonb
    WHERE id = ${run.id}::uuid AND lease_token = ${run.leaseToken}::uuid AND lease_until > now()
      AND status = 'RUNNING' RETURNING id
  `);
  return result.rows.length > 0;
}
async function insertArtifact(
  transaction: DatabaseTransaction,
  runId: string,
  artifact: PendingReportOutput,
) {
  await transaction.execute(sql`
    INSERT INTO app_reporting_run_artifacts(run_id, kind, object_key, filename, content_type, bytes, checksum)
    VALUES (${runId}::uuid, ${artifact.kind}, ${artifact.objectKey}, ${artifact.filename},
      ${artifact.contentType}, ${artifact.bytes}, ${artifact.checksum}) ON CONFLICT (run_id, kind) DO NOTHING
  `);
}
export async function completeReportRun(
  run: ReportRun,
  artifact: PendingReportOutput,
) {
  return getDatabase().transaction(async (transaction) => {
    const result = await transaction.execute(sql`
      UPDATE app_reporting_report_runs SET status = 'SUCCEEDED', rows = ${artifact.rows}, finished_at = now(),
        pending_output = NULL, lease_token = NULL, lease_until = NULL
      WHERE id = ${run.id}::uuid AND lease_token = ${run.leaseToken}::uuid AND lease_until > now()
        AND status = 'RUNNING' RETURNING id
    `);
    if (!result.rows.length) {
      return false;
    }
    await insertArtifact(transaction, run.id, artifact);
    await insertEvent(transaction, run, "reporting.generation.completed", {
      rows: artifact.rows,
      objectKey: artifact.objectKey,
    });
    await recordReportingAudit(
      transaction,
      run.actorId,
      run.id,
      "run.succeeded",
      { rows: artifact.rows },
    );
    return true;
  });
}
export async function failReportRun(run: ReportRun, message: string) {
  return getDatabase().transaction(async (transaction) => {
    const result = await transaction.execute(sql`
      UPDATE app_reporting_report_runs SET status = 'FAILED', error = ${message}, finished_at = now(),
        lease_token = NULL, lease_until = NULL
      WHERE id = ${run.id}::uuid AND lease_token = ${run.leaseToken}::uuid AND lease_until > now()
        AND status IN ('QUEUED', 'PREPARING_SOURCE', 'RUNNING') RETURNING id
    `);
    if (!result.rows.length) {
      return false;
    }
    await insertEvent(transaction, run, "reporting.generation.failed", {
      message,
    });
    await recordReportingAudit(transaction, run.actorId, run.id, "run.failed");
    return true;
  });
}
export async function registerReportErrorArtifact(
  run: ReportRun,
  artifact: PendingReportOutput,
) {
  await getDatabase().transaction(async (transaction) => {
    const result = await transaction.execute(sql`
      SELECT id FROM app_reporting_report_runs WHERE id = ${run.id}::uuid AND status = 'FAILED' FOR SHARE
    `);
    if (result.rows.length) {
      await insertArtifact(transaction, run.id, artifact);
    }
  });
}
export async function listMissingReportErrorArtifacts() {
  const result = await getDatabase().execute<ReportRun>(sql`
    SELECT ${runSelection} FROM app_reporting_report_runs run WHERE status = 'FAILED'
      AND NOT EXISTS (SELECT 1 FROM app_reporting_run_artifacts artifact WHERE artifact.run_id = run.id AND artifact.kind = 'ERROR')
    ORDER BY finished_at LIMIT 2
  `);
  return result.rows;
}
