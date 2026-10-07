import "server-only";
import { captureNotificationOccurrence } from "./ServerNotificationOccurrenceService";
import { pinWebsiteReportDeliveryTemplate } from "../infrastructure/WebsiteReportTemplateRepository";
import type { NotificationOccurrenceTransaction } from "../infrastructure/NotificationOccurrenceRepository";
import type { NotificationEventContextByKey } from "../domain/NotificationEvent";

export async function captureWebsiteReportOccurrence(
  transaction: NotificationOccurrenceTransaction,
  eventKey: "reporting.website.biweekly" | "reporting.website.monthly",
  context: NotificationEventContextByKey["reporting.website.biweekly"],
) {
  const occurrence = await captureNotificationOccurrence(transaction, {
    aggregateId: context.reportId,
    aggregateType: "website-report",
    correlationId: context.reportId,
    eventKey,
    context,
    occurrenceKey: `website-report:${context.reportId}`,
    recipients: [],
  });
  if (occurrence.deliveryCount < 1 || occurrence.status !== "PENDING") {
    throw new Error(
      "Configure at least one active, authorized email recipient before generating the report.",
    );
  }
  const emailTemplate = await pinWebsiteReportDeliveryTemplate(
    transaction,
    occurrence.id,
  );
  return { occurrenceId: occurrence.id, emailTemplate };
}
