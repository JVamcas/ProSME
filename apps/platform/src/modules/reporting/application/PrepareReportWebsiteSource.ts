import "server-only";
import { RequestValidationError } from "@/lib/resource-errors";
import type { ReportRun } from "../domain/Report";
import { googleAnalyticsConfiguration } from "../infrastructure/GoogleAnalyticsConfiguration";
import { websiteAnalyticsQueryIdentity } from "../infrastructure/WebsiteAnalyticsQueryIdentity";
import { registerWebsiteAnalyticsQueries } from "../infrastructure/WebsiteAnalyticsSyncRepository";
import {
  recordReportSourceCoverage,
  reportWebsiteSourceReady,
} from "../infrastructure/ReportWebsiteSourceRepository";
import { websiteAnalyticsQuerySchema } from "../api/WebsiteAnalyticsSchemas";

export async function prepareReportWebsiteSource(run: ReportRun) {
  if (run.definition.datasetKey !== "website-analytics") {
    return true;
  }
  const configuration = googleAnalyticsConfiguration();
  if (
    !configuration ||
    configuration.propertyId !== run.websiteScope?.propertyId ||
    configuration.collectionStart !== run.websiteScope.collectionStart ||
    configuration.timezone !== run.timezone
  ) {
    throw new RequestValidationError(
      "The website source configuration changed. Create a new run.",
    );
  }
  const period = websiteAnalyticsQuerySchema.parse({
    startDate: run.values.startDate,
    endDate: run.values.endDate,
  });
  const identity = websiteAnalyticsQueryIdentity(period, configuration, true);
  await registerWebsiteAnalyticsQueries([identity]);
  if (!(await reportWebsiteSourceReady(identity.queryKey))) return false;
  return recordReportSourceCoverage(run.id, run.leaseToken, identity.queryKey);
}
