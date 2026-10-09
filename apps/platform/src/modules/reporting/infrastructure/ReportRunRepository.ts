import "server-only";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import {
  IdempotencyConflictError,
  ResourceConflictError,
} from "@/lib/resource-errors";
import type {
  ManualReportRunInput,
  ReportListInput,
} from "../api/ReportManagementSchemas";
import type {
  ConfiguredReport,
  ReportArtifact,
  ReportRun,
  ReportRunEvent,
  ReportRunSummary,
} from "../domain/Report";
import type { ReportFormat } from "../domain/ReportDefinition";
import { recordReportingAudit } from "./ReportAuditRepository";

export const runSelection = sql`
  id, report_id AS "reportId", report_name AS "reportName", report_version AS "reportVersion",
  template_id AS "templateId", template_version AS "templateVersion", definition,
  actor_id AS "actorId", values, format, run_at::text AS "runAt", timezone, website_scope AS "websiteScope",
  status, created_at::text AS "createdAt", started_at::text AS "startedAt", finished_at::text AS "finishedAt",
  rows, error, lease_token AS "leaseToken"
`;
export function normalizeReportRun<T extends ReportRun>(row: T): T {
  return {
    ...row,
    runAt: new Date(row.runAt).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
    startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : null,
    finishedAt: row.finishedAt ? new Date(row.finishedAt).toISOString() : null,
  };
}
export const artifactSelection = sql`
  id, run_id AS "runId", kind, object_key AS "objectKey", filename,
  content_type AS "contentType", bytes, checksum
`;
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonical);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}
export async function enqueueReportRun(
  report: ConfiguredReport,
  actorId: string,
  input: ManualReportRunInput,
  format: ReportFormat,
  resolved: Pick<ReportRun, "values" | "runAt" | "timezone" | "websiteScope">,
) {
  // Hash the caller's request, rather than changing relative defaults or the current report version.
  const hash = createHash("sha256")
    .update(
      JSON.stringify(
        canonical({
          values: input.values,
          format: input.format ?? null,
        }),
      ),
    )
    .digest("hex");
  return getDatabase().transaction(async (transaction) => {
    // Lock report configuration against concurrent edits while pinning its version.
    const current = await transaction.execute<{ rowVersion: number }>(sql`
      SELECT row_version AS "rowVersion" FROM app_reporting_reports WHERE id = ${report.id}::uuid FOR SHARE
    `);
    const previous = await transaction.execute<{
      id: string;
      requestHash: string;
    }>(sql`
      SELECT id, request_hash AS "requestHash" FROM app_reporting_report_runs
      WHERE report_id = ${report.id}::uuid AND actor_id = ${actorId}::uuid AND idempotency_key = ${input.idempotencyKey}::uuid
    `);
    if (previous.rows[0]) {
      if (previous.rows[0].requestHash !== hash) {
        throw new IdempotencyConflictError(
          "This run key was used for different parameters or a different format.",
        );
      }
      return { id: previous.rows[0].id };
    }
    if (current.rows[0]?.rowVersion !== report.rowVersion) {
      throw new ResourceConflictError(
        "The report changed before the run was queued. Reload and try again.",
      );
    }
    const result = await transaction.execute<{
      id: string;
      requestHash: string;
    }>(sql`
      INSERT INTO app_reporting_report_runs(report_id, report_name, report_version,
        template_id, template_version, definition, actor_id, idempotency_key, request_hash,
        values, format, run_at, timezone, website_scope)
      VALUES (${report.id}::uuid, ${report.name}, ${report.rowVersion}, ${report.templateId}::uuid,
        ${report.templateVersion}, ${JSON.stringify(report.definition)}::jsonb, ${actorId}::uuid,
        ${input.idempotencyKey}::uuid, ${hash}, ${JSON.stringify(resolved.values)}::jsonb,
        ${format}, ${resolved.runAt}::timestamptz, ${resolved.timezone}, ${JSON.stringify(resolved.websiteScope)}::jsonb)
      ON CONFLICT (report_id, actor_id, idempotency_key) DO NOTHING RETURNING id, request_hash AS "requestHash"
    `);
    if (!result.rows[0]) {
      // The unique identity also protects two concurrent transport retries.
      const duplicate = await transaction.execute<{
        id: string;
        requestHash: string;
      }>(sql`
        SELECT id, request_hash AS "requestHash" FROM app_reporting_report_runs
        WHERE report_id = ${report.id}::uuid AND actor_id = ${actorId}::uuid AND idempotency_key = ${input.idempotencyKey}::uuid
      `);
      if (duplicate.rows[0]?.requestHash !== hash) {
        throw new IdempotencyConflictError(
          "This run key was used for a different request.",
        );
      }
      return { id: duplicate.rows[0].id };
    }
    await recordReportingAudit(
      transaction,
      actorId,
      result.rows[0].id,
      "run.queued",
      {
        reportId: report.id,
        templateVersion: report.templateVersion,
        reportVersion: report.rowVersion,
      },
    );
    return { id: result.rows[0].id };
  });
}
export async function listReportRuns(
  reportId: string,
  input: ReportListInput,
  authorizedDatasets: string[],
) {
  const database = getDatabase();
  const condition = sql`report_id = ${reportId}::uuid AND status ILIKE ${"%" + input.search + "%"}
    AND ((definition->>'datasetKey') || '/' || (definition->>'datasetVersion')) = ANY(${sql.param(authorizedDatasets)}::text[])`;
  const [items, count] = await Promise.all([
    database.execute<ReportRunSummary>(sql`
      SELECT id, status, actor_id AS "actorId", created_at::text AS "createdAt", started_at::text AS "startedAt",
        finished_at::text AS "finishedAt", rows, format, error FROM app_reporting_report_runs
      WHERE ${condition} ORDER BY created_at DESC, id DESC
      LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}
    `),
    database.execute<{ total: number }>(
      sql`SELECT count(*)::integer AS total FROM app_reporting_report_runs WHERE ${condition}`,
    ),
  ]);
  return {
    items: items.rows,
    total: count.rows[0].total,
    page: input.page,
    pageSize: input.pageSize,
  };
}
export async function findReportRunDetail(reportId: string, runId: string) {
  const database = getDatabase();
  const run = await database.execute<ReportRun>(sql`
    SELECT ${runSelection} FROM app_reporting_report_runs WHERE id = ${runId}::uuid AND report_id = ${reportId}::uuid
  `);
  if (!run.rows[0]) {
    return null;
  }
  const [artifacts, events] = await Promise.all([
    database.execute<ReportArtifact>(
      sql`SELECT ${artifactSelection} FROM app_reporting_run_artifacts WHERE run_id = ${runId}::uuid ORDER BY kind`,
    ),
    database.execute<ReportRunEvent>(sql`
      SELECT key, occurred_at::text AS "occurredAt", metadata FROM app_reporting_run_events
      WHERE run_id = ${runId}::uuid ORDER BY occurred_at,
        CASE key WHEN 'reporting.generation.started' THEN 0 WHEN 'reporting.generation.completed' THEN 1 ELSE 2 END
    `),
  ]);
  return {
    run: normalizeReportRun(run.rows[0]),
    artifacts: artifacts.rows,
    events: events.rows,
  };
}
