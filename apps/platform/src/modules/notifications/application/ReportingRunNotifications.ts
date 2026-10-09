import "server-only";
import type { DatabaseTransaction } from "@/platform/database/client";
import type { ReportingEventKey } from "../domain/NotificationReportingEvent";
import { captureReportingRunEvent } from "../infrastructure/ReportingNotificationOccurrenceRepository";

export async function captureReportingLifecycleEvent(
  transaction: DatabaseTransaction,
  runId: string,
  key: ReportingEventKey,
) {
  return captureReportingRunEvent(transaction, runId, key);
}
