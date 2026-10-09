import { hasAuthorizedReportingAudience } from "../infrastructure/ReportingNotificationRecipientRepository";
import "server-only";
import type {
  NotificationDeliveryPage,
  NotificationDeliveryQuery,
} from "../api/NotificationAdministrationSchemas";
import {
  listNotificationDeliveryRecords,
  retryNotificationDeliveryRecord,
} from "../infrastructure/NotificationDeliveryAdministrationRepository";
import type {
  NotificationEventRuleDetail,
  NotificationEventRuleUpdate,
} from "../api/NotificationAdministrationSchemas";
import {
  listNotificationEventRuleRecords,
  findNotificationEventRuleRecord,
  updateNotificationEventRuleRecord,
} from "../infrastructure/NotificationAdministrationRepository";
import type { ReportingEventKey } from "../domain/NotificationReportingEvent";

// Reporting's service checks its canonical delivery permission and source scope.
export async function getScopedReportNotificationRule(
  reportId: string,
  eventKey: ReportingEventKey,
) {
  const record = await findNotificationEventRuleRecord(eventKey, reportId);
  return record
    ? (JSON.parse(JSON.stringify(record)) as NotificationEventRuleDetail)
    : null;
}
export async function saveScopedReportNotificationRule(
  actorId: string,
  reportId: string,
  eventKey: ReportingEventKey,
  update: NotificationEventRuleUpdate,
  correlationId: string,
) {
  return updateNotificationEventRuleRecord({
    actorId,
    reportId,
    eventKey,
    update,
    correlationId,
  });
}

export async function getScopedReportDeliveryHistory(
  query: NotificationDeliveryQuery,
  reportId: string,
  datasets: string[],
) {
  const records = await listNotificationDeliveryRecords(query, {
    reportId,
    datasets,
  });
  return JSON.parse(
    JSON.stringify({
      ...records,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.ceil(records.total / query.pageSize),
    }),
  ) as NotificationDeliveryPage;
}
export async function retryScopedReportDelivery(
  actorId: string,
  reportId: string,
  datasets: string[],
  deliveryId: string,
  reason: string,
) {
  return retryNotificationDeliveryRecord({
    actorId,
    correlationId: crypto.randomUUID(),
    deliveryId,
    reason,
    scope: { reportId, datasets },
  });
}

export async function hasReportSuccessAudience(
  reportId: string,
  requiredPermissions: string[],
) {
  return hasAuthorizedReportingAudience(reportId, requiredPermissions);
}

export async function getScopedReportNotificationOverview(
  reportId: string,
  dataset: string,
) {
  return listNotificationEventRuleRecords({ reportId }, [dataset]);
}
