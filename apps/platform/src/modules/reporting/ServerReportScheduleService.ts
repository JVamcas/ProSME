import { hasReportSuccessAudience } from "@/modules/notifications/application/ServerReportNotificationService";
import "server-only";
import type { AuthenticatedUser } from "@/auth/types";
import { requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import { RequestValidationError } from "@/lib/resource-errors";
import { getReport } from "./ServerReportService";
import { resolveReportRunDefaults } from "./application/ReportRunDefaults";
import { requireReportSourceAccess } from "./application/ReportAccess";
import { reportScheduleInputSchema } from "./domain/ReportSchedule";
import { resolveReportSchedulePeriod } from "./domain/ReportSchedulePeriod";
import { reportingIdSchema } from "./api/ReportManagementSchemas";
import { googleAnalyticsConfiguration } from "./infrastructure/GoogleAnalyticsConfiguration";
import { findReportingPrincipal } from "./infrastructure/ReportPrincipalRepository";
import { findConfiguredReport } from "./infrastructure/ReportRepository";
import {
  advanceReportSchedule,
  claimReportSchedule,
  deferReportSchedule,
  enqueueScheduledReport,
  listReportSchedules,
  saveReportSchedule,
} from "./infrastructure/ReportScheduleRepository";

export async function getReportSchedules(
  user: AuthenticatedUser | null,
  reportId: string,
) {
  await getReport(user, reportId);
  return listReportSchedules(reportId);
}
export async function putReportSchedule(
  user: AuthenticatedUser | null,
  reportId: string,
  values: unknown,
  id?: string,
) {
  const actor = requirePermission(
    user,
    permissionCodes.reportingScheduleUpdateAll,
  );
  const report = await getReport(actor, reportId);
  const input = reportScheduleInputSchema.parse(values);
  if (id) reportingIdSchema.parse(id);
  if (report.definition.datasetKey === "website-analytics") {
    const source = googleAnalyticsConfiguration();
    if (
      !source ||
      source.timezone !== input.timezone ||
      input.anchor < source.collectionStart
    ) {
      throw new RequestValidationError(
        "Website schedules must use the source timezone and complete periods after collection began.",
      );
    }
  }
  if (input.enabled) {
    const owner = await findReportingPrincipal(report.ownerId);
    requirePermission(owner, permissionCodes.reportingReportRunAll);
    requirePermission(owner, permissionCodes.reportingQueryExecuteAll);
    const dataset = await requireReportSourceAccess(owner, report.definition);
    if (
      report.definition.datasetKey === "website-analytics" &&
      !(await hasReportSuccessAudience(reportId, [
        permissionCodes.reportingReportReadAll,
        permissionCodes.reportingRunReadAll,
        permissionCodes.reportingRunDownloadAll,
        permissionCodes.reportingDatasetReadAll,
        ...dataset.definition.sourcePermissions,
      ]))
    ) {
      throw new RequestValidationError(
        "Configure an enabled success email rule with an authorized recipient before enabling a website schedule.",
      );
    }
  }
  const period = resolveReportSchedulePeriod(input, input.anchor);
  resolveReportRunDefaults(
    report,
    scheduleValues(report.definition, period),
    period.dueAt,
    input.timezone,
  );
  return saveReportSchedule(actor.id, reportId, input, period, id);
}

export async function processReportSchedules(now = new Date().toISOString()) {
  const result = { claimed: 0, queued: 0, deferred: 0 };
  // A single tick performs at most four cursor transitions / enqueues.
  for (let index = 0; index < 4; index++) {
    const schedule = await claimReportSchedule(now);
    if (!schedule) break;
    result.claimed++;
    try {
      let period = resolveReportSchedulePeriod(schedule, schedule.cursor);
      if (schedule.pendingRunId) {
        period = resolveReportSchedulePeriod(schedule, period.nextCursor);
        if (!(await advanceReportSchedule(schedule, period))) {
          await deferReportSchedule(schedule);
          result.deferred++;
          continue;
        }
      }
      if (Date.parse(period.dueAt) > Date.parse(now)) {
        await deferReportSchedule(schedule);
        continue;
      }
      const report = await findConfiguredReport(schedule.reportId);
      if (!report) throw new Error("Missing report");
      const owner = await findReportingPrincipal(report.ownerId);
      requirePermission(owner, permissionCodes.reportingReportRunAll);
      requirePermission(owner, permissionCodes.reportingQueryExecuteAll);
      await requireReportSourceAccess(owner, report.definition);
      const resolved = resolveReportRunDefaults(
        report,
        scheduleValues(report.definition, period),
        now,
        schedule.timezone,
      );
      if (
        report.definition.datasetKey === "website-analytics" &&
        resolved.timezone !== schedule.timezone
      ) {
        throw new Error("Source timezone changed");
      }
      if (await enqueueScheduledReport(schedule, report, period, resolved))
        result.queued++;
      else await deferReportSchedule(schedule);
    } catch {
      await deferReportSchedule(
        schedule,
        "Schedule preparation failed. Check the execution owner, source configuration and report parameters.",
      );
      result.deferred++;
    }
  }
  return result;
}

function scheduleValues(
  definition: import("./domain/ReportDefinition").ReportTemplateDefinition,
  period: import("./domain/ReportSchedule").ReportPeriod,
) {
  return Object.fromEntries(
    definition.parameters.flatMap((parameter) => {
      if (parameter.binding !== "value") return [];
      if (parameter.name === "startDate")
        return [[parameter.name, period.startDate]];
      if (parameter.name === "endDate")
        return [[parameter.name, period.endDate]];
      return [];
    }),
  );
}
