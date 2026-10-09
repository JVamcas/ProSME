import "server-only";
import { sql } from "drizzle-orm";
import { getDatabase } from "@/platform/database/client";
import {
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import type {
  ReportListInput,
  ReportTemplateInput,
} from "../api/ReportManagementSchemas";
import {
  reportTemplateDefinitionSchema,
  type PublishedReportTemplate,
  type ReportCatalogueRow,
  type ReportTemplate,
} from "../domain/ReportDefinition";
import { recordReportingAudit } from "./ReportAuditRepository";

const templateSelection = sql`
  id, key, name, description, row_version AS "rowVersion", published_version AS "publishedVersion", definition
`;
export async function listReportTemplates(input: ReportListInput) {
  const condition = sql`name ILIKE ${"%" + input.search + "%"}`;
  const database = getDatabase();
  const [items, count] = await Promise.all([
    database.execute<ReportCatalogueRow>(sql`
      SELECT id, key, name, description, row_version AS "rowVersion", published_version AS "publishedVersion"
      FROM app_reporting_templates WHERE ${condition}
      ORDER BY name, id LIMIT ${input.pageSize} OFFSET ${(input.page - 1) * input.pageSize}
    `),
    database.execute<{ total: number }>(sql`
      SELECT count(*)::integer AS total FROM app_reporting_templates WHERE ${condition}
    `),
  ]);
  return {
    items: items.rows,
    total: count.rows[0].total,
    page: input.page,
    pageSize: input.pageSize,
  };
}
export async function findReportTemplate(id: string) {
  const result = await getDatabase().execute<ReportTemplate>(sql`
    SELECT ${templateSelection} FROM app_reporting_templates WHERE id = ${id}::uuid
  `);
  const row = result.rows[0];
  return row
    ? {
        ...row,
        definition: reportTemplateDefinitionSchema.parse(row.definition),
      }
    : null;
}
export async function findPublishedReportTemplate(
  templateId: string,
  version: number,
) {
  const result = await getDatabase().execute<PublishedReportTemplate>(sql`
    SELECT template_id AS "templateId", version, definition
    FROM app_reporting_template_versions WHERE template_id = ${templateId}::uuid AND version = ${version}
  `);
  const row = result.rows[0];
  return row
    ? {
        ...row,
        definition: reportTemplateDefinitionSchema.parse(row.definition),
      }
    : null;
}
export async function saveReportTemplate(
  actorId: string,
  input: ReportTemplateInput,
  id?: string,
) {
  return getDatabase().transaction(async (transaction) => {
    const definition = JSON.stringify(input.definition);
    const query = id
      ? sql`
      UPDATE app_reporting_templates SET name = ${input.name}, description = ${input.description}, definition = ${definition}::jsonb,
        row_version = row_version + 1, updated_by = ${actorId}::uuid, updated_at = now()
      WHERE id = ${id}::uuid AND row_version = ${input.rowVersion} AND key = ${input.key}
      RETURNING ${templateSelection}
    `
      : sql`
      INSERT INTO app_reporting_templates(key, name, description, definition, updated_by)
      VALUES (${input.key}, ${input.name}, ${input.description}, ${definition}::jsonb, ${actorId}::uuid)
      ON CONFLICT (key) DO NOTHING RETURNING ${templateSelection}
    `;
    const result = await transaction.execute<ReportTemplate>(query);
    const row = result.rows[0];
    if (!row) {
      throw new ResourceConflictError(
        "The template key exists or the draft has changed. Reload before saving.",
      );
    }
    await recordReportingAudit(
      transaction,
      actorId,
      row.id,
      id ? "template.updated" : "template.created",
    );
    return row;
  });
}
export async function publishReportTemplate(
  actorId: string,
  id: string,
  rowVersion: number,
) {
  return getDatabase().transaction(async (transaction) => {
    // Lock and compare the exact draft that was validated by the service.
    const result = await transaction.execute<ReportTemplate>(sql`
      SELECT ${templateSelection} FROM app_reporting_templates WHERE id = ${id}::uuid FOR UPDATE
    `);
    const row = result.rows[0];
    if (!row) {
      throw new ResourceNotFoundError("template");
    }
    if (row.rowVersion !== rowVersion) {
      throw new ResourceConflictError(
        "The draft changed during validation. Reload and validate it again.",
      );
    }
    const version = (row.publishedVersion ?? 0) + 1;
    await transaction.execute(sql`
      INSERT INTO app_reporting_template_versions(template_id, version, definition, published_by)
      VALUES (${id}::uuid, ${version}, ${JSON.stringify(row.definition)}::jsonb, ${actorId}::uuid)
    `);
    await transaction.execute(sql`
      UPDATE app_reporting_templates SET published_version = ${version}, row_version = row_version + 1,
        updated_by = ${actorId}::uuid, updated_at = now() WHERE id = ${id}::uuid
    `);
    await recordReportingAudit(transaction, actorId, id, "template.published", {
      version,
    });
    return { templateId: id, version, definition: row.definition };
  });
}
