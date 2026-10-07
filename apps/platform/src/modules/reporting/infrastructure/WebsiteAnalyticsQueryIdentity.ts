import "server-only";

import { createHash } from "node:crypto";
import type { WebsiteAnalyticsQuery } from "../api/WebsiteAnalyticsSchemas";
import { previousWebsiteAnalyticsPeriod } from "../domain/WebsiteAnalyticsComparison";
import { websiteAnalyticsContractVersion } from "../domain/WebsiteAnalyticsSnapshots";
import type { GoogleAnalyticsConfiguration } from "./GoogleAnalyticsConfiguration";

export function websiteAnalyticsQueryIdentity(
  period: WebsiteAnalyticsQuery,
  configuration: GoogleAnalyticsConfiguration,
  includePanels: boolean,
) {
  const identity = {
    propertyId: configuration.propertyId,
    timezone: configuration.timezone,
    collectionStart: configuration.collectionStart,
    contractVersion: websiteAnalyticsContractVersion,
    startDate: period.startDate,
    endDate: period.endDate,
    fundingCallId: period.fundingCallId ?? null,
  };
  return {
    ...identity,
    queryKey: createHash("sha256")
      .update(JSON.stringify(identity))
      .digest("hex"),
    includePanels,
  };
}

export type WebsiteAnalyticsQueryIdentity = ReturnType<
  typeof websiteAnalyticsQueryIdentity
>;

export function websiteAnalyticsQueryIdentities(
  period: WebsiteAnalyticsQuery,
  configuration: GoogleAnalyticsConfiguration,
) {
  const previous = previousWebsiteAnalyticsPeriod(period);
  const identities = [
    websiteAnalyticsQueryIdentity(period, configuration, true),
  ];
  if (previous.startDate >= configuration.collectionStart) {
    identities.push(
      websiteAnalyticsQueryIdentity(previous, configuration, false),
    );
  }
  return identities;
}
