import { z } from "zod";
import { enqueueReportRetry } from "./infrastructure/ReportRunRetryRepository";
import "server-only";
import { findLatestCompletedSchedulePeriod } from "./infrastructure/ReportScheduleRepository";
import { can, requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  ResourceNotFoundError,
  RequestValidationError,
} from "@/lib/resource-errors";
import {
  configuredReportSaveSchema,
  reportListSchema,
  reportingIdSchema,
  manualReportRunSchema,
  type ConfiguredReportSaveInput,
  type ReportListInput,
  type ManualReportRunInput,
} from "./api/ReportManagementSchemas";
import {
  findConfiguredReport,
  listConfiguredReports,
  saveConfiguredReport,
} from "./infrastructure/ReportRepository";
import { listReportDatasets } from "./infrastructure/ReportDatasetRepository";
import { findPublishedReportTemplate } from "./infrastructure/ReportTemplateRepository";
import {
  enqueueReportRun,
  listReportRuns,
  findReportRunDetail,
} from "./infrastructure/ReportRunRepository";
import { requireReportSourceAccess } from "./application/ReportAccess";
import { resolveReportRunDefaults } from "./application/ReportRunDefaults";
import { configuredReportFormSchema } from "./api/ReportFormSchemas";
import { googleAnalyticsConfiguration } from "./infrastructure/GoogleAnalyticsConfiguration";

export async function getReports(
  user: AuthenticatedUser | null,
  values: ReportListInput,
) {
  requirePermission(user, permissionCodes.reportingReportReadAll);
  return listConfiguredReports(reportListSchema.parse(values));
}
export async function getReport(user: AuthenticatedUser | null, id: string) {
  requirePermission(user, permissionCodes.reportingReportReadAll);
  const report = await findConfiguredReport(reportingIdSchema.parse(id));
  if (!report) {
    throw new ResourceNotFoundError("report");
  }
  await requireReportSourceAccess(user, report.definition);
  let runDefaults: Record<string, unknown> | null = null;
  let runDefaultsError: string | null = null;
  const source = googleAnalyticsConfiguration();
  const runTimezone =
    report.definition.datasetKey === "website-analytics"
      ? (source?.timezone ?? "Africa/Windhoek")
      : "Africa/Windhoek";
  try {
    const runAt = new Date().toISOString();
    const completedPeriod =
      source &&
      report.definition.datasetKey === "website-analytics" &&
      report.defaults.period === "website-completed"
        ? await findLatestCompletedSchedulePeriod(report.id, runAt, source)
        : null;
    runDefaults = resolveReportRunDefaults(
      report,
      {},
      runAt,
      undefined,
      completedPeriod,
    ).values;
  } catch {
    runDefaultsError =
      "Report defaults need valid parameters or completed source dates before generation.";
  }
  return { ...report, runDefaults, runDefaultsError, runTimezone };
}
export async function putReport(
  user: AuthenticatedUser | null,
  values: ConfiguredReportSaveInput,
  id?: string,
) {
  const actor = requirePermission(
    user,
    id
      ? permissionCodes.reportingReportUpdateAll
      : permissionCodes.reportingReportCreateAll,
  );
  requirePermission(actor, permissionCodes.reportingTemplateReadAll);
  const input = configuredReportSaveSchema.parse(values);
  let pinnedVersion: number | undefined;
  if (id) {
    reportingIdSchema.parse(id);
    if (!input.rowVersion) {
      throw new RequestValidationError("The report version is required.");
    }
    const existing = await findConfiguredReport(id);
    if (!existing) {
      throw new ResourceNotFoundError("report");
    }
    await requireReportSourceAccess(actor, existing.definition);
    if (existing.templateId === input.templateId) {
      pinnedVersion = existing.templateVersion;
    }
  }
  const template = await findPublishedReportTemplate(
    input.templateId,
    pinnedVersion,
  );
  if (!template) {
    throw new ResourceNotFoundError("published template version");
  }
  await requireReportSourceAccess(actor, template.definition);
  const resolvedInput = { ...input, templateVersion: template.version };
  configuredReportFormSchema(template.definition).parse(resolvedInput);
  resolveReportRunDefaults(
    { defaults: input.defaults, definition: template.definition },
    {},
  );
  return saveConfiguredReport(actor.id, resolvedInput, id);
}
export async function runReport(
  user: AuthenticatedUser | null,
  id: string,
  values: ManualReportRunInput,
) {
  const actor = requirePermission(user, permissionCodes.reportingReportRunAll);
  requirePermission(actor, permissionCodes.reportingQueryExecuteAll);
  const report = await getReport(actor, id);
  const input = manualReportRunSchema.parse(values);
  const format = input.format ?? report.format;
  if (!report.definition.formats.includes(format)) {
    throw new RequestValidationError(
      "The selected template does not support this format.",
    );
  }
  const resolved = resolveReportRunDefaults(report, {
    ...report.runDefaults,
    ...input.values,
  });
  return enqueueReportRun(report, actor.id, input, format, resolved);
}
export async function getReportRuns(
  user: AuthenticatedUser | null,
  id: string,
  values: ReportListInput,
) {
  requirePermission(user, permissionCodes.reportingRunReadAll);
  await getReport(user, id);
  const datasets = await listReportDatasets();
  const authorizedDatasets = datasets
    .filter((dataset) =>
      dataset.definition.sourcePermissions.every((permission) =>
        can(user, permission),
      ),
    )
    .map((dataset) => `${dataset.key}/${dataset.version}`);
  return listReportRuns(id, reportListSchema.parse(values), authorizedDatasets);
}
export async function getReportRun(
  user: AuthenticatedUser | null,
  reportId: string,
  runId: string,
) {
  requirePermission(user, permissionCodes.reportingRunReadAll);
  requirePermission(user, permissionCodes.reportingReportReadAll);
  reportingIdSchema.parse(reportId);
  const detail = await findReportRunDetail(
    reportId,
    reportingIdSchema.parse(runId),
  );
  if (!detail) {
    throw new ResourceNotFoundError("run");
  }
  await requireReportSourceAccess(user, detail.run.definition);
  return detail;
}

export async function retryReportRun(
  user: AuthenticatedUser | null,
  reportId: string,
  runId: string,
  values: unknown,
) {
  const actor = requirePermission(user, permissionCodes.reportingReportRunAll);
  requirePermission(actor, permissionCodes.reportingQueryExecuteAll);
  const input = z.object({ idempotencyKey: z.uuid() }).strict().parse(values);
  const original = await getReportRun(actor, reportId, runId);
  if (original.run.status !== "FAILED")
    throw new RequestValidationError("Only failed generation can be retried.");
  return enqueueReportRetry(actor.id, original.run, input.idempotencyKey);
}
