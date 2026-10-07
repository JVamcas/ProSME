import { z } from "zod";

export const websiteReportContextSchema = z
  .object({
    reportId: z.uuid(),
    frequency: z.enum(["BIWEEKLY", "MONTHLY"]),
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    timezone: z.string().min(1).max(100),
    generatedAt: z.iso.datetime(),
    reportSummary: z.string().min(1).max(24000),
    sourceNotes: z.string().min(1).max(12000),
  })
  .strict();

export const websiteReportNotificationFields = [
  "brandingLogoUrl",
  "platformName",
  "recipientName",
  "reportFrequency",
  "reportPeriod",
  "reportSummary",
  "sourceNotes",
  "reportUrl",
] as const;

export const websiteReportEventCatalogue = {
  "reporting.website.biweekly": {
    catalogKey: "REPORTING",
    ruleEligibility: "CONFIGURABLE",
    key: "reporting.website.biweekly",
    contextSchema: websiteReportContextSchema,
  },
  "reporting.website.monthly": {
    catalogKey: "REPORTING",
    ruleEligibility: "CONFIGURABLE",
    key: "reporting.website.monthly",
    contextSchema: websiteReportContextSchema,
  },
} as const;

export function websiteReportRenderValues(
  context: z.infer<typeof websiteReportContextSchema>,
  publicApplicationUrl: string,
) {
  return {
    reportFrequency: context.frequency === "BIWEEKLY" ? "Bi-weekly" : "Monthly",
    reportPeriod: `${context.startDate} to ${context.endDate} (${context.timezone})`,
    reportSummary: context.reportSummary,
    sourceNotes: context.sourceNotes,
    reportUrl: new URL(
      `/admin/reports/website/${context.reportId}`,
      publicApplicationUrl,
    ).toString(),
  };
}
