import "server-only";

import { processWebsiteAnalyticsSynchronization } from "./ServerWebsiteAnalyticsSyncService";

export async function processReporting(authorizationHeader: string | null) {
  const synchronization = await processWebsiteAnalyticsSynchronization(authorizationHeader);

  return {
    ...synchronization,
    synchronization,
  };
}
