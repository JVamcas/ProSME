import { ensureReportNotificationRules } from "@/modules/notifications/application/ReportNotificationConfiguration";
import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import { ResourceConflictError } from "@/lib/resource-errors";
import type {
  ConfiguredReportInput,
  ReportListInput,
} from "../api/ReportManagementSchemas";
import type {
  ConfiguredReportDetails,
  ConfiguredReportCatalogueRow,
} from "../domain/Report";
import { recordReportingAudit } from "./ReportAuditRepository";

export async function listConfiguredReports(input: ReportListInput) {
  const database = getDatabase();
  const condition = sql`name ILIKE ${"%" + input.search + "%"}`;
  const [items, count] = await Promise.all([
    database.execute<ConfiguredReportCatalogueRow>(sql`
      SELECT id, name, description, format, template_version AS "templateVersion"
      FROM app_reporting_reports WHERE ${condition}
      ORDER BY name, id LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}
    `),
    database.execute<{ total: number }>(sql`
      SELECT count(*)::integer AS total FROM app_reporting_reports WHERE ${condition}
    `),
  ]);
  return {
    items: items.rows,
    total: count.rows[0].total,
    page: input.page,
    pageSize: input.pageSize,
  };
}
export async function findConfiguredReport(
  id: string,
): Promise<ConfiguredReportDetails | null> {
  const result = await getDatabase().execute<ConfiguredReportDetails>(sql`
    SELECT report.id, report.key, report.name, report.description, report.template_id AS "templateId",
      report.template_version AS "templateVersion", report.defaults, report.format,
      report.owner_id AS "ownerId", report.row_version AS "rowVersion",
      report.report_version AS "reportVersion", version.definition,
      template.name AS "templateName", dataset.name AS "datasetName"
    FROM app_reporting_reports report JOIN app_reporting_template_versions version
      ON version.template_id = report.template_id AND version.version = report.template_version
    JOIN app_reporting_templates template ON template.id = report.template_id
    JOIN app_reporting_datasets dataset
      ON dataset.key = version.definition->>'datasetKey'
      AND dataset.version = (version.definition->>'datasetVersion')::integer
    WHERE report.id = ${id}::uuid
  `);
  return result.rows[0] ?? null;
}
export async function saveConfiguredReport(
  actorId: string,
  input: ConfiguredReportInput,
  id?: string,
) {
  return getDatabase().transaction(async (transaction) => {
    const defaults = JSON.stringify(input.defaults);
    const query = id
      ? sql`
      UPDATE app_reporting_reports SET name = ${input.name}, description = ${input.description}, template_id = ${input.templateId}::uuid,
        template_version = ${input.templateVersion}, defaults = ${defaults}::jsonb, format = ${input.format},
        row_version = row_version + 1, updated_by = ${actorId}::uuid, updated_at = now()
      WHERE id = ${id}::uuid AND row_version = ${input.rowVersion} AND key = ${input.key}
      RETURNING id, report_version AS "reportVersion"
    `
      : sql`
      INSERT INTO app_reporting_reports(key, name, description, template_id, template_version, defaults, format, owner_id, updated_by)
      VALUES (${input.key}, ${input.name}, ${input.description}, ${input.templateId}::uuid, ${input.templateVersion},
        ${defaults}::jsonb, ${input.format}, ${actorId}::uuid, ${actorId}::uuid)
      ON CONFLICT (key) DO NOTHING RETURNING id, report_version AS "reportVersion"
    `;
    const result = await transaction.execute<{
      id: string;
      reportVersion: number;
    }>(query);
    if (!result.rows[0]) {
      throw new ResourceConflictError(
        "The report key exists or the configuration has changed. Reload before saving.",
      );
    }
    await ensureReportNotificationRules(transaction, result.rows[0].id);
    await recordReportingAudit(
      transaction,
      actorId,
      result.rows[0].id,
      id ? "report.updated" : "report.created",
      { reportVersion: result.rows[0].reportVersion },
    );
    return result.rows[0];
  });
}
