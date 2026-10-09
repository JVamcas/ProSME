import { z } from "zod";

export const reportingEventKeys = [
  "reporting.generation.started",
  "reporting.generation.completed",
  "reporting.generation.failed",
] as const;
export type ReportingEventKey = (typeof reportingEventKeys)[number];
export const reportingEventContextSchema = z
  .object({
    reportId: z.uuid(),
    runId: z.uuid(),
    reportName: z.string().min(1).max(200),
    actorId: z.uuid(),
    trigger: z.enum(["USER", "SYSTEM"]),
    timezone: z.string().min(1).max(100),
    startDate: z.iso.date().nullable(),
    endDate: z.iso.date().nullable(),
    occurredAt: z.iso.datetime({ offset: true }),
    rows: z.number().int().nonnegative().nullable(),
    durationSeconds: z.number().nonnegative().nullable(),
    artifactId: z.uuid().nullable(),
  })
  .strict();
export type ReportingEventContext = z.infer<typeof reportingEventContextSchema>;
export const reportingNotificationFields = [
  "platformName",
  "recipientName",
  "brandingLogoUrl",
  "reportName",
  "runId",
  "trigger",
  "timezone",
  "startDate",
  "endDate",
  "occurredAt",
  "rows",
  "durationSeconds",
  "reportUrl",
] as const;
export const reportingEventCatalogue = Object.fromEntries(
  reportingEventKeys.map((key) => [
    key,
    {
      key,
      catalogKey: "REPORTING" as const,
      ruleEligibility: "CONFIGURABLE" as const,
      contextSchema: reportingEventContextSchema,
    },
  ]),
) as {
  [Key in ReportingEventKey]: {
    key: Key;
    catalogKey: "REPORTING";
    ruleEligibility: "CONFIGURABLE";
    contextSchema: typeof reportingEventContextSchema;
  };
};
