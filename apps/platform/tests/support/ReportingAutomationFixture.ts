import type { AuthenticatedUser } from "@/auth/types";
import {
  putReportTemplate,
  checkReportTemplate,
} from "@/modules/reporting/ServerReportDefinitionService";
import { putReport, getReport } from "@/modules/reporting/ServerReportService";
import { applicationExportTemplate } from "@/modules/reporting/application/bootstrap/ApplicationExportTemplate";
import { websiteAnalyticsTemplate } from "@/modules/reporting/application/bootstrap/WebsiteAnalyticsTemplate";
import { seedInitialNotificationConfiguration } from "@/modules/notifications/application/ServerNotificationConfigurationSeedService";
import { seedReportingNotificationTemplates } from "@/modules/notifications/application/ReportNotificationConfiguration";
import {
  getReportDelivery,
  putReportDelivery,
} from "@/modules/reporting/ServerReportDeliveryService";
import type { ReportingEventKey } from "@/modules/notifications/domain/NotificationReportingEvent";

export const automationDates = {
  startDate: "2026-10-01",
  endDate: "2026-10-14",
};
export async function createAutomationReport(
  actor: AuthenticatedUser,
  website = false,
) {
  const template = await putReportTemplate(actor, {
    ...(website ? websiteAnalyticsTemplate : applicationExportTemplate),
    key: `automation-${crypto.randomUUID()}`,
  });
  await checkReportTemplate(
    actor,
    template.id,
    { rowVersion: 1, values: automationDates },
    true,
  );
  const created = await putReport(actor, {
    key: `automation-${crypto.randomUUID()}`,
    name: "Automation fixture",
    description: "Synthetic reporting automation fixture.",
    templateId: template.id,
    defaults: { period: "explicit", values: automationDates },
    format: "CSV",
  });
  return getReport(actor, created.id);
}
export async function installAutomationNotifications(actor: AuthenticatedUser) {
  await seedInitialNotificationConfiguration();
  await seedReportingNotificationTemplates(actor.id);
}
export async function configureAutomationEvent(
  actor: AuthenticatedUser,
  reportId: string,
  eventKey: ReportingEventKey,
) {
  const rule = (await getReportDelivery(actor, reportId)).find(
    (rule) => rule?.eventKey === eventKey,
  )!;
  return putReportDelivery(actor, reportId, eventKey, {
    expectedUpdatedAt: rule!.updatedAt,
    eventEnabled: true,
    isEnabled: true,
    recipients: [
      {
        recipientType: "SPECIFIC_USER",
        targetId: actor.id,
        isRequired: false,
        channelCodes: ["EMAIL"],
      },
    ],
  });
}
