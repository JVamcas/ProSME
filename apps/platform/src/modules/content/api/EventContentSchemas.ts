import { z } from "zod";
import { eventTypeOptions } from "../domain/EventMetadata";

export const eventContentQuerySchema = z
  .object({
    search: z.string().trim().max(200).default(""),
    eventType: z
      .enum(eventTypeOptions.map((option) => option.value))
      .optional(),
    category: z.string().trim().max(200).optional(),
    period: z.enum(["all", "upcoming", "recordings"]).default("all"),
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  })
  .strict();

export const eventSearchFormSchema = z.object({
  eventType: z.union([
    z.literal(""),
    z.enum(eventTypeOptions.map((option) => option.value)),
  ]),
  search: z.string().trim().max(200),
});

export type EventContentQuery = z.infer<typeof eventContentQuerySchema>;
export type EventSearchForm = z.infer<typeof eventSearchFormSchema>;
