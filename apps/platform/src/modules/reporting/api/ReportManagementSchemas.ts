import { z } from "zod";
import {
  reportTemplateDefinitionSchema,
  reportFormatSchema,
} from "../domain/ReportDefinition";
import { reportDefaultsSchema } from "../domain/Report";
import { reportDescriptionSchema } from "../domain/ReportDescription";

export const reportingIdSchema = z.uuid();
export const reportListSchema = z.object({
  search: z.string().max(100).default(""),
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
});
export type ReportListInput = z.infer<typeof reportListSchema>;
const identity = {
  key: z.string().regex(/^[a-z][a-z0-9-]{0,79}$/),
  name: z.string().trim().min(1).max(160),
  description: reportDescriptionSchema,
};
export const reportTemplateInputSchema = z
  .object({
    ...identity,
    definition: reportTemplateDefinitionSchema,
    rowVersion: z.number().int().positive().optional(),
  })
  .strict();
export type ReportTemplateInput = z.infer<typeof reportTemplateInputSchema>;
export const reportValidationSchema = z
  .object({
    rowVersion: z.number().int().positive(),
    values: z.record(z.string(), z.unknown()),
  })
  .strict();
export const configuredReportInputSchema = z
  .object({
    ...identity,
    templateId: z.uuid(),
    templateVersion: z.number().int().positive(),
    defaults: reportDefaultsSchema,
    format: reportFormatSchema,
    rowVersion: z.number().int().positive().optional(),
  })
  .strict();
export type ConfiguredReportInput = z.infer<typeof configuredReportInputSchema>;
export const configuredReportSaveSchema = configuredReportInputSchema.omit({
  templateVersion: true,
});
export type ConfiguredReportSaveInput = z.infer<
  typeof configuredReportSaveSchema
>;
export const manualReportRunSchema = z
  .object({
    idempotencyKey: z.uuid(),
    values: z.record(z.string(), z.unknown()).default({}),
    format: reportFormatSchema.optional(),
  })
  .strict();
export type ManualReportRunInput = z.infer<typeof manualReportRunSchema>;
