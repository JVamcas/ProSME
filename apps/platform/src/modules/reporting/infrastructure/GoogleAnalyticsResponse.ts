import { z } from "zod";
import type {
  AnalyticsSourceMetadata,
  AnalyticsSourceResult,
} from "../domain/WebsiteAnalyticsMetrics";

const metadataSchema = z
  .object({
    timeZone: z.string().optional(),
    subjectToThresholding: z.boolean().optional(),
    dataLossFromOtherRow: z.boolean().optional(),
    samplingMetadatas: z
      .array(
        z.object({
          samplesReadCount: z.string(),
          samplingSpaceSize: z.string(),
        }),
      )
      .optional(),
  })
  .passthrough();

const reportSchema = z.object({
  dimensionHeaders: z.array(z.object({ name: z.string() })).optional(),
  metricHeaders: z.array(z.object({ name: z.string() })).optional(),
  rows: z
    .array(
      z.object({
        dimensionValues: z.array(z.object({ value: z.string() })).optional(),
        metricValues: z.array(z.object({ value: z.string() })),
      }),
    )
    .optional(),
  rowCount: z.number().optional(),
  metadata: metadataSchema.optional(),
  kind: z.string().optional(),
});

export const analyticsReportSchema = reportSchema
  .superRefine((report, context) => {
    if (report.metricHeaders) return;
    // GA omits headers on a successful dimensionless report with no data.
    const emptyReport =
      report.kind === "analyticsData#runReport" &&
      Boolean(report.metadata?.timeZone) &&
      !report.rows?.length &&
      !report.rowCount;
    if (!emptyReport) {
      context.addIssue({
        code: "custom",
        path: ["metricHeaders"],
        message: "Missing analytics metric headers.",
      });
    }
  })
  .transform((report) => ({
    ...report,
    metricHeaders: report.metricHeaders ?? [],
  }));

export type AnalyticsReport = z.infer<typeof analyticsReportSchema>;

export function normalizedAnalyticsResult<T>(
  report: AnalyticsReport,
  data: T,
): AnalyticsSourceResult<T> {
  return {
    state: report.rows?.length ? "ready" : "no-data",
    data,
    fetchedAt: new Date().toISOString(),
    metadata: sourceMetadata(report),
    note: null,
  };
}

export function stringDimension(
  report: AnalyticsReport,
  row: NonNullable<AnalyticsReport["rows"]>[number],
  name: string,
) {
  const index =
    report.dimensionHeaders?.findIndex((header) => header.name === name) ?? -1;
  const value = row.dimensionValues?.[index]?.value;
  if (value === undefined) throw new Error("Invalid analytics dimension.");
  return value;
}

export function sourceMetadata(
  report: AnalyticsReport,
): AnalyticsSourceMetadata {
  const metadata = report.metadata;
  return {
    timezone: metadata?.timeZone ?? null,
    subjectToThresholding: metadata?.subjectToThresholding ?? false,
    dataLossFromOtherRow: metadata?.dataLossFromOtherRow ?? false,
    sampled: Boolean(metadata?.samplingMetadatas?.length),
    sampling: metadata?.samplingMetadatas ?? [],
  };
}

export function numericMetric(
  report: AnalyticsReport,
  row: NonNullable<AnalyticsReport["rows"]>[number],
  name: string,
) {
  const index = report.metricHeaders.findIndex(
    (header) => header.name === name,
  );
  const raw = row.metricValues[index]?.value;
  const value = raw === undefined || raw.trim() === "" ? NaN : Number(raw);
  if (!Number.isFinite(value) || value < 0)
    throw new Error("Invalid analytics metric.");
  return value;
}

export function countMetric(
  report: AnalyticsReport,
  row: NonNullable<AnalyticsReport["rows"]>[number],
  name: string,
) {
  const count = numericMetric(report, row, name);
  if (!Number.isSafeInteger(count))
    throw new Error("Invalid analytics user count.");
  return count;
}

export function funnelCounts(
  report: AnalyticsReport,
  events: readonly string[],
) {
  const index =
    report.dimensionHeaders?.findIndex(
      (header) => header.name === "funnelStepName",
    ) ?? -1;
  if (
    index < 0 ||
    !report.metricHeaders.some((header) => header.name === "activeUsers")
  ) {
    throw new Error("Invalid analytics funnel headers.");
  }
  const rows = report.rows ?? [];
  return events.map((event, step) => {
    const matching = rows.filter(
      (row) => row.dimensionValues?.[index]?.value === `${step + 1}. ${event}`,
    );
    if (matching.length !== 1) {
      if (rows.length === 0) return 0;
      throw new Error("Incomplete analytics funnel.");
    }
    return countMetric(report, matching[0], "activeUsers");
  });
}
