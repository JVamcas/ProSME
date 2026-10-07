import "server-only";
import { AuthenticationRequiredError } from "@/auth/authorization/policy";
import { isAuthorizedServiceProcessorRequest } from "@/platform/jobs/ServiceProcessorAuthorization";
import { synchronizeWebsiteAnalyticsSources } from "./application/WebsiteAnalyticsSourceReads";
import { googleAnalyticsConfiguration } from "./infrastructure/GoogleAnalyticsConfiguration";
import { websiteAnalyticsQueryIdentities } from "./infrastructure/WebsiteAnalyticsQueryIdentity";
import {
  claimWebsiteAnalyticsSync,
  registerWebsiteAnalyticsQueries,
  saveWebsiteAnalyticsSync,
} from "./infrastructure/WebsiteAnalyticsSyncRepository";

export async function processWebsiteAnalyticsSynchronization(
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
  const result = { claimed: 0, processed: 0, failed: 0, skipped: 0 };
  if (!configuration) return result;

  const endDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: configuration.timezone,
  }).format(new Date());
  const start = new Date(`${endDate}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - 29);
  await registerWebsiteAnalyticsQueries(
    websiteAnalyticsQueryIdentities(
      {
        startDate: start.toISOString().slice(0, 10),
        endDate,
      },
      configuration,
    ),
  );
  const job = await claimWebsiteAnalyticsSync(configuration);
  if (!job) return result;
  result.claimed = 1;
  const sources = await synchronizeWebsiteAnalyticsSources(
    {
      startDate: job.startDate,
      endDate: job.endDate,
      ...(job.fundingCallId ? { fundingCallId: job.fundingCallId } : {}),
    },
    configuration,
    job.includePanels,
  );
  if (!(await saveWebsiteAnalyticsSync(job, sources))) {
    result.skipped = 1;
    return result;
  }
  result.processed = 1;
  result.failed = Object.values(sources).some(
    (source) => source.data === null || source.fetchedAt === null,
  )
    ? 1
    : 0;
  return result;
}
