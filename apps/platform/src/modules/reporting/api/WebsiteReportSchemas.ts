import { z } from "zod";
import { websiteReportFrequencies } from "../domain/WebsiteReport";

export const websiteReportListSchema = z
  .object({
    frequency: z.enum(websiteReportFrequencies).optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const websiteScheduleUpdateSchema = z
  .object({
    expectedVersion: z.number().int().min(1),
    enabled: z.boolean(),
    anchorDate: z.iso.date(),
    sendTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    finalizationDelayHours: z.number().int().min(24).max(168),
  })
  .strict();

export const websiteReportIdSchema = z.uuid();
export type WebsiteReportListInput = z.infer<typeof websiteReportListSchema>;
export type WebsiteScheduleUpdateInput = z.infer<
  typeof websiteScheduleUpdateSchema
>;
