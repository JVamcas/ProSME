import { z } from "zod";
import { reportColumnTypeSchema, reportDatasetKeySchema } from "../domain/ReportDataset";
import { reportParameterDefinitionsSchema } from "../domain/ReportParameters";
import { reportQueryLimits } from "../domain/ReportQueryLimits";
import { websiteAnalyticsQuerySchema } from "./WebsiteAnalyticsSchemas";

export const reportQuerySchema = z
  .object({
    datasetKey: reportDatasetKeySchema,
    datasetVersion: z.number().int().positive(),
    sql: z.string().min(1).max(reportQueryLimits.sqlBytes),
    parameters: reportParameterDefinitionsSchema,
    values: z.record(z.string(), z.unknown()),
    columns: z
      .array(
        z
          .object({
            name: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,62}$/),
            type: reportColumnTypeSchema,
          })
          .strict(),
      )
      .min(1)
      .max(100),
    websitePeriod: websiteAnalyticsQuerySchema.optional(),
  })
  .strict();

export type ReportQueryInput = z.infer<typeof reportQuerySchema>;
