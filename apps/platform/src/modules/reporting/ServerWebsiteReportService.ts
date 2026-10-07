import "server-only";
import {
  can,
  requireAnyPermission,
  requirePermission,
} from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import type { AuthenticatedUser } from "@/auth/types";
import {
  RequestValidationError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import {
  websiteReportIdSchema,
  websiteReportListSchema,
  websiteScheduleUpdateSchema,
  type WebsiteReportListInput,
  type WebsiteScheduleUpdateInput,
} from "./api/WebsiteReportSchemas";
import {
  findSavedWebsiteReport,
  listSavedWebsiteReports,
} from "./infrastructure/WebsiteReportReadRepository";
import {
  findWebsiteReportSchedule,
  listWebsiteReportSchedules,
  updateWebsiteReportSchedule,
} from "./infrastructure/WebsiteReportScheduleRepository";
import { googleAnalyticsConfiguration } from "./infrastructure/GoogleAnalyticsConfiguration";

export function getWebsiteReportsPageContext(user: AuthenticatedUser | null) {
  requirePermission(user, permissionCodes.reportingWebsiteReportReadAll);
  return {
    canConfigure: can(user, permissionCodes.reportingWebsiteScheduleUpdateAll),
  };
}

export function getWebsiteReportSettingsPageContext(
  user: AuthenticatedUser | null,
) {
  requireAnyPermission(user, [
    permissionCodes.reportingWebsiteReportReadAll,
    permissionCodes.reportingWebsiteScheduleUpdateAll,
  ]);
  return {
    canUpdate: can(user, permissionCodes.reportingWebsiteScheduleUpdateAll),
    canReadRecipients: can(user, permissionCodes.notificationConfigurationRead),
    canUpdateRecipients: can(
      user,
      permissionCodes.notificationConfigurationUpdate,
    ),
  };
}

export async function getSavedWebsiteReports(
  user: AuthenticatedUser | null,
  input: WebsiteReportListInput,
) {
  requirePermission(user, permissionCodes.reportingWebsiteReportReadAll);
  return listSavedWebsiteReports(websiteReportListSchema.parse(input));
}

export async function getSavedWebsiteReport(
  user: AuthenticatedUser | null,
  id: string,
) {
  requirePermission(user, permissionCodes.reportingWebsiteReportReadAll);
  const report = await findSavedWebsiteReport(websiteReportIdSchema.parse(id));
  if (!report) throw new ResourceNotFoundError("website report");
  return report;
}

export async function getWebsiteReportSchedules(
  user: AuthenticatedUser | null,
) {
  requireAnyPermission(user, [
    permissionCodes.reportingWebsiteReportReadAll,
    permissionCodes.reportingWebsiteScheduleUpdateAll,
  ]);
  const configuration = googleAnalyticsConfiguration();
  return {
    schedules: await listWebsiteReportSchedules(),
    propertyTimezone: configuration?.timezone ?? null,
    collectionStart: configuration?.collectionStart ?? null,
  };
}

export async function saveWebsiteReportSchedule(
  user: AuthenticatedUser | null,
  id: string,
  input: WebsiteScheduleUpdateInput,
) {
  const actor = requirePermission(
    user,
    permissionCodes.reportingWebsiteScheduleUpdateAll,
  );
  const identifier = websiteReportIdSchema.parse(id);
  const values = websiteScheduleUpdateSchema.parse(input);
  const configuration = googleAnalyticsConfiguration();
  if (!configuration)
    throw new RequestValidationError(
      "Configure the GA property, timezone and collection start before scheduling reports.",
    );
  const schedule = await findWebsiteReportSchedule(identifier);
  if (!schedule) throw new ResourceNotFoundError("website report schedule");
  if (values.anchorDate < configuration.collectionStart) {
    throw new RequestValidationError(
      "The first reporting period must start on or after analytics collection began.",
    );
  }
  if (schedule.frequency === "MONTHLY" && !values.anchorDate.endsWith("-01")) {
    throw new RequestValidationError(
      "A monthly reporting period must start on the first of a month.",
    );
  }
  return updateWebsiteReportSchedule({
    id: identifier,
    actorId: actor.id,
    values,
    timezone: configuration.timezone,
  });
}
