import "server-only";
import { RequestValidationError } from "@/lib/resource-errors";
import type { ConfiguredReport } from "../domain/Report";
import { resolvedReportValues } from "../domain/ReportParameterValues";
import { googleAnalyticsConfiguration } from "../infrastructure/GoogleAnalyticsConfiguration";

export function resolveReportRunDefaults(
  report: Pick<ConfiguredReport, "defaults" | "definition">,
  overrides: Record<string, unknown>,
  runAt = new Date().toISOString(),
  requestedTimezone?: string,
  completedPeriod?: { startDate: string; endDate: string } | null,
) {
  const configuration = googleAnalyticsConfiguration();
  const website = report.definition.datasetKey === "website-analytics";
  if (website && !configuration) {
    throw new RequestValidationError(
      "Website analytics source configuration is required.",
    );
  }
  const timezone = website
    ? configuration!.timezone
    : (requestedTimezone ?? "Africa/Windhoek");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(
    new Date(runAt),
  );
  const end = new Date(`${today}T00:00:00Z`);
  end.setUTCDate(0);
  const start = new Date(end);
  start.setUTCDate(1);
  const relative: Record<string, unknown> = {};
  if (report.defaults.period === "previous-month") {
    Object.assign(relative, {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    });
  }
  if (report.defaults.period === "website-completed") {
    const yesterday = new Date(`${today}T00:00:00Z`);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    Object.assign(relative, {
      startDate: completedPeriod?.startDate ?? configuration?.collectionStart,
      endDate: completedPeriod?.endDate ?? yesterday.toISOString().slice(0, 10),
    });
  }
  const values = resolvedReportValues(
    report.definition.parameters,
    { ...relative, ...report.defaults.values, ...overrides },
    runAt,
    timezone,
  );
  if (
    typeof values.startDate === "string" &&
    typeof values.endDate === "string"
  ) {
    if (values.startDate > values.endDate) {
      throw new RequestValidationError(
        "No completed dates are available or the end date precedes the start date.",
      );
    }
    if (website && values.startDate < configuration!.collectionStart) {
      throw new RequestValidationError(
        "Website reports cannot begin before collection started.",
      );
    }
  }
  return {
    values,
    timezone,
    runAt,
    websiteScope: website
      ? {
          propertyId: configuration!.propertyId,
          collectionStart: configuration!.collectionStart,
        }
      : null,
  };
}
