import { reportTemplateQuery } from "./domain/ReportDefinition";
import "server-only";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  reportBootstrapTemplates,
  reportBootstrapReports,
} from "./application/bootstrap/ReportBootstrapInventory";
import {
  installReportBootstrap,
  readReportBootstrapState,
} from "./infrastructure/ReportBootstrapRepository";
import { validateReportQuery } from "./ServerReportQueryService";
import { reportTemplateDefinitionSchema } from "./domain/ReportDefinition";
import { googleAnalyticsConfiguration } from "./infrastructure/GoogleAnalyticsConfiguration";
import { requireReportSourceAccess } from "./application/ReportAccess";
import { RequestValidationError } from "@/lib/resource-errors";
import { configuredReportFormSchema } from "./api/ReportFormSchemas";

export async function bootstrapReports(user: AuthenticatedUser | null) {
  const actor = requirePermission(
    user,
    permissionCodes.reportingTemplateCreateAll,
  );
  requirePermission(actor, permissionCodes.reportingTemplatePublishAll);
  requirePermission(actor, permissionCodes.reportingReportCreateAll);
  const configuration = googleAnalyticsConfiguration();
  if (!configuration) {
    throw new RequestValidationError(
      "Configure the website property, collection start and timezone before bootstrap validation.",
    );
  }
  const state = await readReportBootstrapState(
    reportBootstrapTemplates.map((template) => template.key),
    reportBootstrapReports.map((report) => report.key),
  );
  const existing = new Map(
    state.templates.map((template) => [template.key, template]),
  );
  const installedReports = new Set(state.reportKeys);
  for (const report of reportBootstrapReports) {
    if (installedReports.has(report.key)) {
      continue;
    }
    const current = existing.get(report.templateKey);
    const definition =
      current?.definition ??
      reportBootstrapTemplates.find(
        (template) => template.key === report.templateKey,
      )!.definition;
    configuredReportFormSchema(definition).parse({
      key: report.key,
      name: report.name,
      description: report.description,
      templateId: actor.id,
      templateVersion: current?.version ?? 1,
      defaults: report.defaults,
      format: "XLSX",
    });
  }
  // The restricted executor rejects work above its two-execution capacity.
  // Validate sequentially so bootstrap leaves room for an interactive query.
  for (const template of reportBootstrapTemplates) {
    const definition = reportTemplateDefinitionSchema.parse(
      template.definition,
    );
    await requireReportSourceAccess(actor, definition);
    const query = reportTemplateQuery(definition);
    const dates = {
      startDate: configuration.collectionStart,
      endDate: configuration.collectionStart,
    };
    await validateReportQuery(actor, {
      ...query,
      values: Object.fromEntries(
        definition.parameters.flatMap((parameter) => {
          if (parameter.binding !== "value") {
            return [];
          }
          if (parameter.name === "startDate" || parameter.name === "endDate") {
            return [[parameter.name, dates[parameter.name]]];
          }
          return [];
        }),
      ),
      ...(definition.datasetKey === "website-analytics"
        ? { websitePeriod: dates }
        : {}),
    });
  }
  return installReportBootstrap(
    actor.id,
    reportBootstrapTemplates,
    reportBootstrapReports,
    new Map(
      reportBootstrapTemplates.map((template) => [
        template.key,
        existing.get(template.key) ?? {
          version: 1,
          definition: template.definition,
        },
      ]),
    ),
  );
}
