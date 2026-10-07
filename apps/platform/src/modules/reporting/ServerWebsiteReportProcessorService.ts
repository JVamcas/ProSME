import "server-only";
import { AuthenticationRequiredError } from "@/auth/authorization/policy";
import { isAuthorizedServiceProcessorRequest } from "@/platform/jobs/ServiceProcessorAuthorization";
import { captureWebsiteReportOccurrence } from "@/modules/notifications/application/ServerWebsiteReportOccurrenceService";
import { googleAnalyticsConfiguration } from "./infrastructure/GoogleAnalyticsConfiguration";
import {
  claimDueWebsiteReport,
  deferWebsiteReport,
} from "./infrastructure/WebsiteReportClaimRepository";
import { readCompletedWebsiteReportSources } from "./infrastructure/WebsiteReportSourceRepository";
import { finalizeWebsiteReport } from "./infrastructure/WebsiteReportFinalizeRepository";
import {
  websiteReportDueAt,
  websiteReportPeriod,
} from "./domain/WebsiteReportPeriods";
import { buildWebsiteReportSnapshot } from "./application/WebsiteReportSnapshot";

export async function processWebsiteReports(
  authorizationHeader: string | null,
) {
  const secret =
    process.env.REPORTING_PROCESSOR_SECRET ||
    process.env.NOTIFICATION_PROCESSOR_SECRET ||
    "";
  if (!isAuthorizedServiceProcessorRequest(authorizationHeader, secret)) {
    throw new AuthenticationRequiredError();
  }
  const configuration = googleAnalyticsConfiguration();
  const result = { claimed: 0, generated: 0, waiting: 0, failed: 0 };
  if (!configuration) return result;
  const job = await claimDueWebsiteReport(configuration);
  if (!job) return result;
  result.claimed = 1;
  try {
    if (
      job.configuration.analytics.propertyId !== configuration.propertyId ||
      job.configuration.analytics.timezone !== configuration.timezone ||
      job.configuration.analytics.collectionStart !==
        configuration.collectionStart
    ) {
      throw new Error(
        "The report's pinned analytics configuration must be restored before generation.",
      );
    }
    const completed = await readCompletedWebsiteReportSources(job);
    if (!completed) {
      await deferWebsiteReport(
        job,
        "Waiting for completed source aggregates after the period finalization time.",
      );
      result.waiting = 1;
      return result;
    }
    const generatedAt = new Date().toISOString();
    const snapshot = buildWebsiteReportSnapshot(job, completed, generatedAt);
    const nextPeriod = websiteReportPeriod(
      job.frequency,
      job.configuration.nextStart,
    );
    const finalized = await finalizeWebsiteReport({
      job,
      snapshot,
      generatedAt,
      nextDueAt: websiteReportDueAt({
        nextStart: nextPeriod.nextStart,
        sendTime: job.configuration.sendTime,
        timezone: configuration.timezone,
        finalizationDelayHours: job.configuration.finalizationDelayHours,
      }),
      capture: (transaction) =>
        captureWebsiteReportOccurrence(
          transaction,
          job.configuration.eventKey,
          {
            reportId: job.id,
            frequency: job.frequency,
            startDate: job.startDate,
            endDate: job.endDate,
            timezone: configuration.timezone,
            generatedAt,
            reportSummary: snapshot.summary,
            sourceNotes: snapshot.sourceNotes,
          },
        ),
    });
    result.generated = finalized ? 1 : 0;
    if (!finalized) {
      await deferWebsiteReport(
        job,
        "Generation paused or reclaimed by another processor.",
      );
      result.waiting = 1;
    }
  } catch {
    await deferWebsiteReport(
      job,
      "Generation failed. Check source configuration, designated recipients and the published email template before retrying.",
    );
    result.failed = 1;
  }
  return result;
}
