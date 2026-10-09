import {
  notificationDeliveryQuerySchema,
  notificationDeliveryRetrySchema,
} from "@/modules/notifications/api/NotificationAdministrationSchemas";
import { listReportDatasets } from "./infrastructure/ReportDatasetRepository";
import { reportingIdSchema } from "./api/ReportManagementSchemas";
import "server-only";
import { randomUUID } from "node:crypto";
import type { AuthenticatedUser } from "@/auth/types";
import { can, requirePermission } from "@/auth/authorization/policy";
import { permissionCodes } from "@/auth/authorization/permissions";
import {
  RequestValidationError,
  ResourceConflictError,
  ResourceNotFoundError,
} from "@/lib/resource-errors";
import { getReport } from "./ServerReportService";
import {
  reportingEventKeys,
  type ReportingEventKey,
} from "@/modules/notifications/domain/NotificationReportingEvent";
import {
  notificationEventRuleUpdateSchema,
  type NotificationEventRuleDetail,
} from "@/modules/notifications/api/NotificationAdministrationSchemas";
import {
  getScopedReportNotificationOverview,
  getScopedReportNotificationRule,
  saveScopedReportNotificationRule,
  getScopedReportDeliveryHistory,
  retryScopedReportDelivery,
} from "@/modules/notifications/application/ServerReportNotificationService";

function eventKey(value: string): ReportingEventKey {
  if (!reportingEventKeys.includes(value as ReportingEventKey)) {
    throw new RequestValidationError("Choose a report lifecycle event.");
  }
  return value as ReportingEventKey;
}
export async function getReportDelivery(
  user: AuthenticatedUser | null,
  reportId: string,
) {
  await getReport(user, reportId);
  return Promise.all(
    reportingEventKeys.map((key) =>
      getScopedReportNotificationRule(reportId, key),
    ),
  );
}
export async function putReportDelivery(
  user: AuthenticatedUser | null,
  reportId: string,
  key: string,
  values: unknown,
) {
  const actor = requirePermission(
    user,
    permissionCodes.reportingDeliveryUpdateAll,
  );
  await getReport(actor, reportId);
  const update = notificationEventRuleUpdateSchema.parse(values);
  const selectedKey = eventKey(key);
  const current = await getScopedReportNotificationRule(reportId, selectedKey);
  if (!current) throw new ResourceNotFoundError("report delivery rule");
  if (update.eventEnabled !== current.eventEnabled) {
    throw new RequestValidationError(
      "Global event activation is controlled by notification administration.",
    );
  }
  assertRecipients(update, current);
  const result = await saveScopedReportNotificationRule(
    actor.id,
    reportId,
    selectedKey,
    update,
    randomUUID(),
  );
  if (!result)
    throw new ResourceConflictError(
      "The recipients changed. Refresh and try again.",
    );
  return getScopedReportNotificationRule(reportId, selectedKey);
}
function assertRecipients(
  update: ReturnType<typeof notificationEventRuleUpdateSchema.parse>,
  current: NotificationEventRuleDetail,
) {
  const users = new Set(current.recipientOptions.users.map((user) => user.id));
  const roles = new Set(current.recipientOptions.roles.map((role) => role.id));
  const channels = new Set(
    current.channels
      .filter((channel) => channel.isEnabled)
      .map((channel) => channel.code),
  );
  for (const recipient of update.recipients) {
    const validTarget =
      recipient.recipientType === "SPECIFIC_USER"
        ? users.has(recipient.targetId)
        : recipient.recipientType === "SPECIFIC_ROLE" &&
          roles.has(recipient.targetId);
    if (
      !validTarget ||
      recipient.channelCodes.some((code) => !channels.has(code))
    ) {
      throw new RequestValidationError(
        "Choose an active user or existing role and an enabled channel.",
      );
    }
  }
}

async function authorizedDeliveryDatasets(user: AuthenticatedUser | null) {
  const datasets = await listReportDatasets();
  return datasets
    .filter((dataset) =>
      dataset.definition.sourcePermissions.every((permission) =>
        can(user, permission),
      ),
    )
    .map((dataset) => `${dataset.key}/${dataset.version}`);
}
export async function getReportDeliveryHistory(
  user: AuthenticatedUser | null,
  reportId: string,
  values: unknown,
) {
  requirePermission(user, permissionCodes.reportingDeliveryUpdateAll);
  await getReport(user, reportId);
  const query = notificationDeliveryQuerySchema.parse(values);
  return getScopedReportDeliveryHistory(
    query,
    reportId,
    await authorizedDeliveryDatasets(user),
  );
}
export async function retryReportDelivery(
  user: AuthenticatedUser | null,
  reportId: string,
  deliveryId: string,
  values: unknown,
) {
  const actor = requirePermission(
    user,
    permissionCodes.reportingDeliveryUpdateAll,
  );
  await getReport(actor, reportId);
  reportingIdSchema.parse(deliveryId);
  const { reason } = notificationDeliveryRetrySchema.parse(values);
  const result = await retryScopedReportDelivery(
    actor.id,
    reportId,
    await authorizedDeliveryDatasets(actor),
    deliveryId,
    reason,
  );
  if (result.outcome === "NOT_FOUND")
    throw new ResourceNotFoundError("delivery");
  if (result.outcome === "INELIGIBLE")
    throw new ResourceConflictError("Only failed deliveries can be retried.");
  return result;
}

export async function getReportEventRuleScope(
  user: AuthenticatedUser | null,
  reportId?: string,
) {
  if (reportId) await getReport(user, reportId);
  if (
    !can(user, permissionCodes.reportingReportReadAll) ||
    !can(user, permissionCodes.reportingDatasetReadAll)
  )
    return [];
  return authorizedDeliveryDatasets(user);
}

export async function getReportDeliveryOverview(
  user: AuthenticatedUser | null,
  reportId: string,
) {
  const report = await getReport(user, reportId);
  return getScopedReportNotificationOverview(
    reportId,
    `${report.definition.datasetKey}/${report.definition.datasetVersion}`,
  );
}
