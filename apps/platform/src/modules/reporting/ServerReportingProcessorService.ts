import "server-only";

import { processReportGeneration } from "./ServerReportGenerationService";

import { processWebsiteAnalyticsSynchronization } from "./ServerWebsiteAnalyticsSyncService";

export async function processReporting(authorizationHeader: string | null) {
  const synchronization =
    await processWebsiteAnalyticsSynchronization(authorizationHeader);

  const generation = await processReportGeneration();

  return {
    ...synchronization,
    synchronization,
    generation,
  };
}
