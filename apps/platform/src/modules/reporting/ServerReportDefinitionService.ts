import { reportTemplateQuery } from "./domain/ReportDefinition";
import "server-only";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceConflictError,
  ResourceNotFoundError,
  RequestValidationError,
} from "@/lib/resource-errors";
import {
  reportListSchema,
  reportingIdSchema,
  reportTemplateInputSchema,
  reportValidationSchema,
  type ReportListInput,
  type ReportTemplateInput,
} from "./api/ReportManagementSchemas";
import { listReportDatasets } from "./infrastructure/ReportDatasetRepository";
import {
  findPublishedReportTemplate,
  findReportTemplate,
  listReportTemplates,
  publishReportTemplate,
  saveReportTemplate,
} from "./infrastructure/ReportTemplateRepository";
import { requireReportSourceAccess } from "./application/ReportAccess";
import { validateReportSql } from "./infrastructure/ReportSqlPolicy";
import { validateReportQuery } from "./ServerReportQueryService";

export async function getReportDatasets(user: AuthenticatedUser | null) {
  requirePermission(user, permissionCodes.reportingDatasetReadAll);
  return listReportDatasets();
}
export async function getReportTemplates(
  user: AuthenticatedUser | null,
  values: ReportListInput,
) {
  requirePermission(user, permissionCodes.reportingTemplateReadAll);
  return listReportTemplates(reportListSchema.parse(values));
}
export async function getReportTemplate(
  user: AuthenticatedUser | null,
  id: string,
) {
  requirePermission(user, permissionCodes.reportingTemplateReadAll);
  const template = await findReportTemplate(reportingIdSchema.parse(id));
  if (!template) {
    throw new ResourceNotFoundError("template");
  }
  return template;
}
export async function putReportTemplate(
  user: AuthenticatedUser | null,
  values: ReportTemplateInput,
  id?: string,
) {
  const actor = requirePermission(
    user,
    id
      ? permissionCodes.reportingTemplateUpdateAll
      : permissionCodes.reportingTemplateCreateAll,
  );
  const input = reportTemplateInputSchema.parse(values);
  if (id) {
    reportingIdSchema.parse(id);
    if (!input.rowVersion) {
      throw new RequestValidationError("The draft version is required.");
    }
  }
  const dataset = await requireReportSourceAccess(actor, input.definition);
  if (dataset.version !== input.definition.datasetVersion) {
    throw new RequestValidationError("Dataset version mismatch.");
  }
  return saveReportTemplate(actor.id, input, id);
}
export async function checkReportTemplate(
  user: AuthenticatedUser | null,
  id: string,
  values: unknown,
  publish = false,
) {
  const actor = requirePermission(
    user,
    publish
      ? permissionCodes.reportingTemplatePublishAll
      : permissionCodes.reportingTemplateReadAll,
  );
  const input = reportValidationSchema.parse(values);
  const template = await getReportTemplate(actor, id);
  if (template.rowVersion !== input.rowVersion) {
    throw new ResourceConflictError(
      "The draft has changed. Reload before validating.",
    );
  }
  const dataset = await requireReportSourceAccess(actor, template.definition);
  const names = await validateReportSql(
    template.definition.sql,
    dataset,
    template.definition.parameters.length,
  );
  if (
    names.join("\0") !==
    template.definition.columns.map((column) => column.name).join("\0")
  ) {
    throw new RequestValidationError(
      "Declared columns must match the SQL projection in order.",
    );
  }
  const query = reportTemplateQuery(template.definition);
  const websitePeriod =
    query.datasetKey === "website-analytics"
      ? {
          startDate: input.values.startDate,
          endDate: input.values.endDate,
        }
      : undefined;
  await validateReportQuery(actor, {
    ...query,
    values: input.values,
    ...(websitePeriod
      ? {
          websitePeriod: websitePeriod as {
            startDate: string;
            endDate: string;
          },
        }
      : {}),
  });
  return publish
    ? publishReportTemplate(actor.id, id, input.rowVersion)
    : { valid: true };
}

export async function getPublishedReportTemplate(
  user: AuthenticatedUser | null,
  id: string,
  version: number,
) {
  requirePermission(user, permissionCodes.reportingTemplateReadAll);
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new RequestValidationError(
      "A positive published version is required.",
    );
  }
  const template = await findPublishedReportTemplate(
    reportingIdSchema.parse(id),
    version,
  );
  if (!template) {
    throw new ResourceNotFoundError("published template version");
  }
  return template;
}
