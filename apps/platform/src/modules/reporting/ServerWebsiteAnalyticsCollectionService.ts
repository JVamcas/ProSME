import "server-only";

import { recordAnonymousEligibilityCheck } from "./infrastructure/AnonymousEligibilityRepository";
import type { SelfCheckOutcome } from "./domain/WebsiteAnalyticsCollection";

export function getWebsiteAnalyticsMeasurementId() {
  if (process.env.GA_COLLECTION_ENABLED !== "true") return null;
  const measurementId = process.env.GA_MEASUREMENT_ID?.trim();
  return measurementId && /^G-[A-Z0-9]+$/.test(measurementId)
    ? measurementId
    : null;
}

export function getWebsiteHeatmapConfiguration() {
  let timezone = process.env.GA_PROPERTY_TIMEZONE ?? "Africa/Windhoek";
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format();
  } catch {
    timezone = "Africa/Windhoek";
  }
  return {
    provider: "Platform" as const,
    googleAnalyticsEnabled: process.env.GA_COLLECTION_ENABLED === "true",
    collectionEnabled: process.env.WEBSITE_HEATMAP_ENABLED === "true",
    timezone,
  };
}

export function hasWebsiteAnalyticsConsent(headers: Headers) {
  return (headers.get("cookie") ?? "")
    .split(";")
    .some((cookie) => cookie.trim() === "smefund_analytics_consent=accepted");
}

export async function collectAnonymousEligibilityOutcome(input: {
  fundingCallId: string;
  ruleSetVersionId: string;
  outcome: SelfCheckOutcome;
}) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      recordAnonymousEligibilityCheck(input),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("Collection timed out.")),
          1000,
        );
      }),
    ]);
  } catch {
    // Do not log the request/error payload: it may contain identifying answers.
    console.warn("Anonymous eligibility analytics could not be recorded.");
  } finally {
    clearTimeout(timer);
  }
}
