import { z } from "zod";

export const reportDatasetKeySchema = z.enum([
  "website-analytics",
  "application-data",
  "workflow-operations",
]);

export type ReportDatasetKey = z.infer<typeof reportDatasetKeySchema>;

export const reportColumnTypeSchema = z.enum([
  "text",
  "uuid",
  "date",
  "timestamptz",
  "numeric",
  "integer",
  "boolean",
]);

export const reportDatasetDefinitionSchema = z
  .object({
    relations: z
      .array(
        z
          .object({
            name: z
              .string()
              .regex(/^app_reporting_dataset_[a-z0-9_]+_v[1-9][0-9]*$/),
            grain: z.string().min(1),
            columns: z
              .array(
                z
                  .object({
                    name: z.string().regex(/^[a-z][a-z0-9_]*$/),
                    type: reportColumnTypeSchema,
                    nullable: z.boolean(),
                  })
                  .strict(),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1),
    joins: z.array(
      z
        .object({
          from: z.string(),
          to: z.string(),
          cardinality: z.enum(["1:1", "1:N", "N:1"]),
        })
        .strict(),
    ),
    sourcePermissions: z.array(z.string().min(1)).min(1),
    functions: z.array(z.string().regex(/^[a-z][a-z0-9_]*$/)),
    scope: z.literal("all"),
    notes: z.array(z.string()),
  })
  .strict();

export type ReportDataset = {
  key: ReportDatasetKey;
  version: number;
  name: string;
  description: string;
  definition: z.infer<typeof reportDatasetDefinitionSchema>;
};

export type ReportColumnType = z.infer<typeof reportColumnTypeSchema>;
