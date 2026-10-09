import "server-only";
import type { DatabaseTransaction } from "@/platform/database/client";
import {
  ensureReportNotificationRules as ensureRules,
  seedReportingNotificationTemplates as seedTemplates,
} from "../infrastructure/ReportingNotificationConfigurationRepository";

export async function ensureReportNotificationRules(
  transaction: DatabaseTransaction,
  reportId: string,
) {
  return ensureRules(transaction, reportId);
}
export async function seedReportingNotificationTemplates(actorId: string) {
  return seedTemplates(actorId);
}
