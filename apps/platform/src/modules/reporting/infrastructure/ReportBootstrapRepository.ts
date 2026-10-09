import "server-only";
import { sql } from "drizzle-orm";
import { isDeepStrictEqual } from "node:util";
import { getDatabase } from "@/platform/database/client";
import { ResourceConflictError } from "@/lib/resource-errors";
import type {
  ReportBootstrapTemplate,
  ReportBootstrapReport,
} from "../application/bootstrap/ReportBootstrapContract";
import { recordReportingAudit } from "./ReportAuditRepository";
import type { ReportTemplateDefinition } from "../domain/ReportDefinition";

export async function readReportBootstrapState(
  templateKeys: string[],
  reportKeys: string[],
) {
  const database = getDatabase();
  const [templates, reports] = await Promise.all([
    database.execute<{
      key: string;
      version: number | null;
      definition: ReportTemplateDefinition | null;
    }>(sql`
      SELECT template.key, template.published_version AS version, version.definition
      FROM app_reporting_templates template
      LEFT JOIN app_reporting_template_versions version ON version.template_id = template.id
        AND version.version = template.published_version
      WHERE template.key = ANY(${sql.param(templateKeys)}::text[])
    `),
    database.execute<{ key: string }>(sql`
      SELECT key FROM app_reporting_reports WHERE key = ANY(${sql.param(reportKeys)}::text[])
    `),
  ]);
  return {
    templates: templates.rows,
    reportKeys: reports.rows.map((row) => row.key),
  };
}

export async function installReportBootstrap(
  actorId: string,
  templates: ReportBootstrapTemplate[],
  reports: ReportBootstrapReport[],
  expectedTemplates: Map<
    string,
    { version: number | null; definition: ReportTemplateDefinition | null }
  >,
) {
  return getDatabase().transaction(async (transaction) => {
    // Serializes explicit bootstrap invocations; related inserts and audits are atomic.
    await transaction.execute(sql`SELECT pg_advisory_xact_lock(761035)`);
    let templatesCreated = 0;
    let reportsCreated = 0;
    for (const template of templates) {
      const created = await transaction.execute<{ id: string }>(sql`
        INSERT INTO app_reporting_templates(key, name, description, definition, published_version, updated_by)
        VALUES (${template.key}, ${template.name}, ${template.description}, ${JSON.stringify(template.definition)}::jsonb, 1, ${actorId}::uuid)
        ON CONFLICT (key) DO NOTHING RETURNING id
      `);
      if (created.rows[0]) {
        const id = created.rows[0].id;
        await transaction.execute(sql`
          INSERT INTO app_reporting_template_versions(template_id, version, definition, published_by)
          VALUES (${id}::uuid, 1, ${JSON.stringify(template.definition)}::jsonb, ${actorId}::uuid)
        `);
        await recordReportingAudit(
          transaction,
          actorId,
          id,
          "template.bootstrapped",
          { version: 1 },
        );
        templatesCreated++;
      }
    }
    // Read mappings in one bounded set query; no per-report template lookup.
    const mappings = await transaction.execute<{
      id: string;
      key: string;
      version: number | null;
      definition: ReportTemplateDefinition | null;
    }>(sql`
      SELECT template.id, template.key, template.published_version AS version, version.definition
      FROM app_reporting_templates template
      LEFT JOIN app_reporting_template_versions version ON version.template_id = template.id
        AND version.version = template.published_version
      WHERE template.key IN (${sql.join(
        templates.map((template) => sql`${template.key}`),
        sql`, `,
      )})
      FOR SHARE OF template
    `);
    const byKey = new Map(mappings.rows.map((row) => [row.key, row]));
    for (const [key, expected] of expectedTemplates) {
      const current = byKey.get(key);
      if (
        current?.version !== expected.version ||
        !isDeepStrictEqual(current.definition, expected.definition)
      ) {
        throw new ResourceConflictError(
          "A bootstrap template changed during validation. Rerun bootstrap.",
        );
      }
    }
    for (const report of reports) {
      const template = byKey.get(report.templateKey);
      if (!template?.version) {
        throw new ResourceConflictError(
          "An existing bootstrap template has no published version. Publish it before rerunning bootstrap.",
        );
      }
      const created = await transaction.execute<{ id: string }>(sql`
        INSERT INTO app_reporting_reports(key, name, description, template_id, template_version, defaults, format, owner_id, updated_by)
        VALUES (${report.key}, ${report.name}, ${report.description}, ${template.id}::uuid, ${template.version},
          ${JSON.stringify(report.defaults)}::jsonb, 'XLSX', ${actorId}::uuid, ${actorId}::uuid)
        ON CONFLICT (key) DO NOTHING RETURNING id
      `);
      if (created.rows[0]) {
        await recordReportingAudit(
          transaction,
          actorId,
          created.rows[0].id,
          "report.bootstrapped",
        );
        reportsCreated++;
      }
    }
    return { templatesCreated, reportsCreated };
  });
}
