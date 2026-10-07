import "server-only";
import { processWebsiteReports } from "./ServerWebsiteReportProcessorService";
import { processWebsiteAnalyticsSynchronization } from "./ServerWebsiteAnalyticsSyncService";

export async function processReporting(authorizationHeader: string | null) {
  // Register exact scheduled periods first; D1 then synchronizes that queued work.
  const reports = await processWebsiteReports(authorizationHeader);
  const synchronization =
    await processWebsiteAnalyticsSynchronization(authorizationHeader);
  return {
    claimed: synchronization.claimed + reports.claimed,
    processed: synchronization.processed + reports.generated,
    failed: synchronization.failed + reports.failed,
    skipped: synchronization.skipped + reports.waiting,
    reports,
    synchronization,
  };
}
